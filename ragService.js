import { OllamaEmbeddings, ChatOllama } from "@langchain/ollama";
import { Document } from "@langchain/core/documents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import fs from 'fs';
import { parse } from 'csv-parse/sync';

// 코사인 유사도 연산 (자체 메모리 벡터 스토어용)
function cosineSimilarity(a, b) {
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

class SimpleMemoryVectorStore {
    constructor(embeddings) {
        this.embeddings = embeddings;
        this.store = [];
    }
    async addDocuments(docs) {
        // Embed texts in batches to match chunk sizes if needed, but for small files it's fine all at once
        const texts = docs.map(d => d.pageContent);
        const vectors = await this.embeddings.embedDocuments(texts);
        docs.forEach((doc, i) => {
            this.store.push({ doc, vector: vectors[i] });
        });
    }
    async search(query, k = 15) {
        const queryVector = await this.embeddings.embedQuery(query);
        const scoredDocs = this.store.map(item => ({
            doc: item.doc,
            score: cosineSimilarity(queryVector, item.vector)
        }));
        scoredDocs.sort((a, b) => b.score - a.score);
        return scoredDocs.slice(0, k).map(item => item.doc);
    }
    // 메타데이터 기반 직접 필터링
    filterByMetadata(filterFn) {
        return this.store.filter(item => filterFn(item.doc.metadata)).map(item => item.doc);
    }
}

let vectorStore = null;

export const initializeVectorStore = async (csvFilePath) => {
    console.log('[RAG] 벡터 저장소 로딩 및 임베딩 초기화 중...');

    try {
        const embeddings = new OllamaEmbeddings({
            model: "nomic-embed-text",
            maxRetries: 2,
        });

        if (!fs.existsSync(csvFilePath)) {
            console.log('[RAG] 대상 CSV 파일을 찾을 수 없습니다:', csvFilePath);
            return;
        }

        const content = fs.readFileSync(csvFilePath, 'utf8');
        const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });

        // CSV 레코드를 자연어 기반 Document로 매핑 (의미 유사도 검색 최적화)
        const docs = records.map(record => {
            const text = `
[부서]: ${record.department}
[직원]: ${record.employee}
[수행 기간]: ${record.week_start} 주차
[프로젝트]: ${record.project_name} (코드: ${record.project_code})
[상세 요일별 투입 시간]: 월(${record.mon}h), 화(${record.tue}h), 수(${record.wed}h), 목(${record.thu}h), 금(${record.fri}h), 토(${record.sat}h), 일(${record.sun}h)
[총 업무시간]: ${record.total} 시간
`.trim();

            return new Document({
                pageContent: text,
                metadata: {
                    department: record.department,
                    employee: record.employee,
                    project: record.project_name,
                    total: parseFloat(record.total) || 0,
                    week: record.week_start
                }
            });
        });

        // ── 주간 직원별 요약 + 초과근무 Document 생성 ──
        // Dashboard와 동일한 로직: employee+week_start 그룹핑 후 주 40시간 초과분 = 초과근무
        const weeklyMap = {};
        records.forEach(record => {
            const key = `${record.employee}-${record.week_start}`;
            if (!weeklyMap[key]) {
                weeklyMap[key] = {
                    employee: record.employee,
                    department: record.department,
                    week_start: record.week_start,
                    totalHours: 0,
                    projects: [],
                    dailyHours: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 }
                };
            }
            weeklyMap[key].totalHours += parseFloat(record.total) || 0;
            weeklyMap[key].projects.push(record.project_name);
            ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach(day => {
                weeklyMap[key].dailyHours[day] += parseFloat(record[day]) || 0;
            });
        });

        const summaryDocs = Object.values(weeklyMap).map(summary => {
            const overtime = summary.totalHours > 40 ? Math.round((summary.totalHours - 40) * 10) / 10 : 0;
            const hasOvertime = overtime > 0;
            const uniqueProjects = [...new Set(summary.projects)].join(', ');
            const dailyStr = Object.entries(summary.dailyHours)
                .map(([d, h]) => {
                    const dayMap = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일' };
                    return `${dayMap[d]}(${h}h)`;
                }).join(', ');

            const text = `
[주간 직원 요약]
[부서]: ${summary.department}
[직원]: ${summary.employee}
[수행 기간]: ${summary.week_start} 주차
[주간 총 업무시간]: ${Math.round(summary.totalHours * 10) / 10} 시간
[기준 근무시간]: 40 시간
[초과근무 여부]: ${hasOvertime ? '있음' : '없음'}
[초과근무 시간]: ${overtime} 시간
[일별 합산 업무시간]: ${dailyStr}
[수행 프로젝트]: ${uniqueProjects}
`.trim();

            return new Document({
                pageContent: text,
                metadata: {
                    type: 'weekly_summary',
                    department: summary.department,
                    employee: summary.employee,
                    total: Math.round(summary.totalHours * 10) / 10,
                    overtime: overtime,
                    hasOvertime: hasOvertime,
                    week: summary.week_start
                }
            });
        });

        // ── 전체 초과근무 통계 요약 Document ──
        const overtimeEntries = Object.values(weeklyMap).filter(s => s.totalHours > 40);
        const totalOvertimeHours = overtimeEntries.reduce((sum, s) => sum + (s.totalHours - 40), 0);
        const overtimeEmployees = [...new Set(overtimeEntries.map(s => s.employee))];

        if (overtimeEntries.length > 0) {
            const overtimeDetail = overtimeEntries
                .sort((a, b) => (b.totalHours - 40) - (a.totalHours - 40))
                .map(s => `  - ${s.employee} (${s.department}): ${s.week_start} 주차, 총 ${Math.round(s.totalHours)}시간, 초과근무 ${Math.round((s.totalHours - 40) * 10) / 10}시간`)
                .join('\n');

            const globalSummaryText = `
[전체 초과근무 통계]
[초과근무 발생 건수]: ${overtimeEntries.length}건
[초과근무 총 시간]: ${Math.round(totalOvertimeHours * 10) / 10} 시간
[초과근무 대상 직원]: ${overtimeEmployees.join(', ')} (총 ${overtimeEmployees.length}명)
[상세 내역]:
${overtimeDetail}
`.trim();

            summaryDocs.push(new Document({
                pageContent: globalSummaryText,
                metadata: {
                    type: 'overtime_global_summary',
                    totalOvertime: Math.round(totalOvertimeHours * 10) / 10,
                    count: overtimeEntries.length
                }
            }));
        }

        const allDocs = [...docs, ...summaryDocs];

        // 메모리에 VectorStore 구축
        vectorStore = new SimpleMemoryVectorStore(embeddings);
        await vectorStore.addDocuments(allDocs);
        console.log(`[RAG] 벡터 저장소 구축 완료. (총 ${allDocs.length}개 조각, 원본 ${docs.length} + 요약 ${summaryDocs.length})`);
    } catch (e) {
        console.error('[RAG] 임베딩 초기화 실패:', e);
    }
};

export const chatWithRag = async (messageHistory, currentQuery) => {
    try {
        // 1. 초기화 확인
        if (!vectorStore) {
            return {
                text: "데이터베이스 임베딩이 준비되지 않았거나 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
                hasChart: false,
                chartData: null
            };
        }

        // 2. Retrieval (유사한 데이터 문맥 검색)
        // 초과근무 관련 질문인지 파악
        const isOvertimeQuery = currentQuery.includes('초과') || currentQuery.includes('야근') ||
            currentQuery.includes('overtime') || currentQuery.includes('잔업') ||
            currentQuery.includes('40시간');

        let relevantDocs = await vectorStore.search(currentQuery, 25);
        let overtimeContext = '';

        if (isOvertimeQuery) {
            // 초과근무 관련 문서를 메타데이터로 직접 가져옴 (벡터 유사도에 의존하지 않음)
            const overtimeSummaries = vectorStore.filterByMetadata(meta =>
                (meta.type === 'weekly_summary' && meta.hasOvertime === true) ||
                meta.type === 'overtime_global_summary'
            );
            if (overtimeSummaries.length > 0) {
                overtimeContext = '\n\n[!! 초과근무 관련 핵심 데이터 시작 !!]\n' +
                    overtimeSummaries.map(d => d.pageContent).join('\n---\n') +
                    '\n[!! 초과근무 관련 핵심 데이터 종료 !!]\n';
                console.log(`[RAG] 초과근무 직접 조회: ${overtimeSummaries.length}건의 관련 문서 발견`);
            }
        }

        const contextText = overtimeContext + '\n' + relevantDocs.map(d => d.pageContent).join('\n---\n');
        const rawData = relevantDocs.map(d => d.metadata);

        // 3. 차트 요청 파악 및 데이터 조합 (Heuristic 기반 빠른 차트 생성)
        const isChartRequest = currentQuery.includes('차트') ||
            currentQuery.includes('그래프') ||
            currentQuery.includes('시각화') ||
            currentQuery.includes('그려');

        let chartData = null;
        if (isChartRequest && rawData.length > 0) {
            const agg = {};
            const groupByTeam = currentQuery.includes('팀') || currentQuery.includes('부서');

            // 질문 조건에 따라 팀 합계 혹은 개인 시간 합계 집계
            rawData.forEach(r => {
                const key = groupByTeam ? r.department : r.employee;
                if (!key) return;
                agg[key] = (agg[key] || 0) + r.total;
            });

            chartData = Object.keys(agg).map(k => ({
                name: k,
                time: parseFloat(agg[k].toFixed(1))
            }));

            // 상위 항목 정렬
            chartData.sort((a, b) => b.time - a.time);

            // 최대 10개만 차트에 표출되도록 자르기
            chartData = chartData.slice(0, 10);
        }

        // 4. LLM Generation (검색된 문맥을 프롬프트로 Qwen2.5에 주입하여 답변 생성)
        const llm = new ChatOllama({
            model: "qwen2.5:7b",
            temperature: 0.2, // 답변의 일관성을 높이기 위해 temperature를 낮춤
            maxRetries: 2,
        });

        const promptTemplate = ChatPromptTemplate.fromMessages([
            ["system", `당신은 이름이 '하나(HANA)'인 뛰어난 업무 데이터 분석 AI 어시스턴트입니다.
반드시 한국어로 친절하게 답변하며, 아래 제공된 [문맥 데이터]만을 바탕으로 사용자의 질문에 답해야 합니다.
데이터에 내용이 전혀 없다면 "현재 시스템 상에 해당 질문을 만족하는 업무 기록 데이터가 없습니다."라고 사실대로 말하세요.
만약 사용자가 표, 차트, 그래프 등의 시각화를 명시적으로 요청한 경우, 답변 내에 "말씀하신 데이터를 바탕으로 차트를 준비했습니다."라는 문구를 꼭 포함하세요.

[문맥 데이터 시작]
{context}
[문맥 데이터 종료]
`],
            // 이전 채팅 기록 주입 (최근 5개만)
            ...messageHistory.slice(-5).map(m => [m.sender === 'user' ? 'human' : 'ai', m.text]),
            ["human", "{question}"]
        ]);

        const chain = promptTemplate.pipe(llm).pipe(new StringOutputParser());

        console.log(`[RAG] Qwen2.5 언어 모델 호출 중... (주입된 컨텍스트 조각 수: ${relevantDocs.length})`);
        const responseText = await chain.invoke({
            context: contextText,
            question: currentQuery
        });

        return {
            text: responseText,
            hasChart: isChartRequest && chartData && chartData.length > 0,
            chartData: (isChartRequest && chartData && chartData.length > 0) ? chartData : null
        };
    } catch (e) {
        console.error('[RAG] 채팅 처리 중 에러:', e);
        return {
            text: "죄송합니다. LLM AI 추론 중 오류가 발생했습니다. Ollama 서버가 켜져 있는지 확인해 주세요.",
            hasChart: false,
            chartData: null
        };
    }
};
