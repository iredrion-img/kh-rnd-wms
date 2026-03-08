/**
 * retrievalPipeline.js — Full RAG Retrieval Pipeline
 *
 * Pipeline:
 *   query → bge-m3 embedding → Qdrant vector search (top-20)
 *   → metadata filter → bge-reranker (top-5) → context builder → LLM reasoning
 */

import { embedText } from './embeddingService.js';
import { searchVectors } from './qdrantService.js';
import { rerank } from './rerankerService.js';
import { ChatOllama } from "@langchain/ollama";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const LLM_MODEL = 'qwen2.5:7b';

/**
 * Build Qdrant metadata filter from query keywords and intent
 */
function buildMetadataFilter(query, intentResult = null) {
    const filters = [];
    const keywords = intentResult?.keywords || [];

    // Helper to check both query string and extracted keywords
    const hasKeyword = (word) => query.includes(word) || keywords.includes(word);

    // Extract year mentions
    const yearMatch = query.match(/20\d{2}/);
    if (yearMatch) {
        filters.push({ key: 'year', match: { value: parseInt(yearMatch[0]) } });
    }

    // Extract month mentions (한국어)
    const monthMap = {
        '1월': 1, '2월': 2, '3월': 3, '4월': 4, '5월': 5, '6월': 6,
        '7월': 7, '8월': 8, '9월': 9, '10월': 10, '11월': 11, '12월': 12
    };
    for (const [kr, num] of Object.entries(monthMap)) {
        if (hasKeyword(kr)) {
            filters.push({ key: 'month', match: { value: num } });
            break;
        }
    }

    // Extract document type hints
    if (hasKeyword('초과근무') || hasKeyword('야근') || hasKeyword('overtime')) {
        filters.push({ key: 'document_type', match: { value: 'employee_week' } });
    }

    // Dynamic keyword filtering (for department or employee names if they end in specific suffixes or are short)
    for (const kw of keywords) {
        if (kw.endsWith('팀') || kw.endsWith('부') || kw.endsWith('본부')) {
            filters.push({ key: 'department', match: { value: kw } });
        } else if (kw.length <= 4 && !kw.includes('월') && !kw.includes('년') && !kw.includes('시간') && !kw.includes('현황')) {
            // Very naive way to guess it might be an employee name if it's a short keyword that isn't a date/metric
            filters.push({ key: 'employee', match: { value: kw } });
        }
    }

    if (filters.length === 0) return null;
    return { must: filters };
}

/**
 * Build context text from reranked results
 */
function buildContext(results) {
    return results.map((r, i) => {
        const text = r.payload?.text || r.text || '';
        return `--- Document ${i + 1} (relevance: ${(r.rerankerScore || r.score || 0).toFixed(3)}) ---\n${text}`;
    }).join('\n\n');
}

/**
 * Main retrieval pipeline
 *
 * @param {string} query - user question
 * @param {Array} messageHistory - chat history
 * @param {object} options - { topSearch: 20, topRerank: 5, useReranker: true, intentResult }
 * @returns {Promise<{text: string, hasChart: boolean, chartData: any, sources: Array}>}
 */
export async function retrieve(query, messageHistory = [], options = {}) {
    const { topSearch = 20, topRerank = 5, useReranker = true, intentResult = null } = options;

    console.log(`[RAG Pipeline] Query: "${query.slice(0, 60)}..."`);

    // ── Step 1: Embed query ──
    console.log('[RAG Pipeline] Step 1 — Embedding query with bge-m3...');
    const queryVector = await embedText(query);

    // ── Step 2: Metadata filter ──
    console.log('[RAG Pipeline] Step 2 — Building metadata filter...');
    const filter = buildMetadataFilter(query, intentResult);
    if (filter) console.log('[RAG Pipeline] Filter:', JSON.stringify(filter));

    // ── Step 3: Vector search ──
    console.log(`[RAG Pipeline] Step 3 — Qdrant vector search (top-${topSearch})...`);
    let searchResults = await searchVectors(queryVector, topSearch, filter);

    // Fallback: if filter returns nothing, try without filter
    if (searchResults.length === 0 && filter) {
        console.log('[RAG Pipeline] Filtered search returned 0, retrying without filter...');
        searchResults = await searchVectors(queryVector, topSearch, null);
    }

    if (searchResults.length === 0) {
        console.log('[RAG Pipeline] No results found. Passing empty context to LLM...');
    } else {
        console.log(`[RAG Pipeline] Found ${searchResults.length} results.`);
    }

    // Normalize to common format
    const candidates = searchResults.map(r => ({
        text: r.payload?.text || '',
        payload: r.payload || {},
        score: r.score || 0
    }));

    // ── Step 4: Rerank ──
    let finalResults;
    if (useReranker && candidates.length > topRerank) {
        console.log(`[RAG Pipeline] Step 4 — Reranking with bge-reranker (${candidates.length} → ${topRerank})...`);
        finalResults = await rerank(query, candidates, topRerank);
    } else {
        finalResults = candidates.slice(0, topRerank);
    }

    // ── Step 5: Build context ──
    console.log('[RAG Pipeline] Step 5 — Building context...');
    const contextText = buildContext(finalResults);

    // ── Step 6: Chart data aggregation ──
    const isChartRequest = query.includes('차트') || query.includes('그래프') ||
        query.includes('시각화') || query.includes('그려');

    let chartData = null;
    if (isChartRequest) {
        const agg = {};
        const groupByTeam = query.includes('팀') || query.includes('부서');
        finalResults.forEach(r => {
            const key = groupByTeam ? r.payload.department : r.payload.employee;
            if (!key) return;
            agg[key] = (agg[key] || 0) + (r.payload.total || 0);
        });
        chartData = Object.keys(agg).map(k => ({ name: k, time: parseFloat(agg[k].toFixed(1)) }));
        chartData.sort((a, b) => b.time - a.time);
        chartData = chartData.slice(0, 10);
    }

    // ── Step 7: LLM reasoning ──
    console.log('[RAG Pipeline] Step 6 — LLM reasoning with Qwen2.5-7B...');

    const llm = new ChatOllama({ model: LLM_MODEL, temperature: 0.2, maxRetries: 2 });

    const promptTemplate = ChatPromptTemplate.fromMessages([
        ["system", `당신은 이름이 '하나(HANA)'인 R&D 센터 업무 데이터 분석시스템의 'AI Director'입니다.
RAG 파이프라인 수집 데이터를 바탕으로 경영진 보고서를 작성합니다.

반드시 지켜야 할 원칙:
1. 문맥 데이터에 사용자가 찾는 정보(예: 특정 직원)가 없더라도 절대 친절하게 대화체로 설명하지 마십시오.
2. 오직 아래 JSON 구조와 정확히 일치하는 순수 JSON 객체만 반환하세요. 마크다운 코드 블록(\`\`\`json)조차 쓰지 마세요.
3. 데이터가 부족하면 그냥 해당 JSON 필드 내부에 "관련 데이터가 존재하지 않습니다."라고 적으세요.

{{
  "topic": "질문에 따른 분석 주제",
  "summary": "발견된 주요 결과 혹은 데이터 없음 알림",
  "evidence": "문맥에 등장하는 부서/직원/프로젝트 등 나열 (없으면 '데이터 없음')",
  "insights": "문맥 기반 인사이트 분석 (없으면 '분석 불가')",
  "implications": "경영진 시사점 (없으면 '추가 수집 필요')",
  "coverage": "문맥상 사용된 주간 또는 데이터 세트 명시"
}}

[문맥 데이터 시작]
{context}
[문맥 데이터 종료]`],
        ...messageHistory.slice(-5).map(m => [m.sender === 'user' ? 'human' : 'ai', m.text]),
        ["human", `사용자 질문: {question}\n\n다른 말은 전혀 하지 말고 오직 유효한 JSON 객체만 출력해.`]
    ]);

    const chain = promptTemplate.pipe(llm).pipe(new StringOutputParser());
    let rawResponse = await chain.invoke({ context: contextText, question: query });

    let responseText = rawResponse;
    try {
        // Cleaning potential markdown wrappers
        let jsonStr = rawResponse.replace(/```json/i, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonStr);

        responseText = `[${parsed.topic}]

1. 요약 (Summary)
   ${parsed.summary}

2. 근거 데이터 (Evidence)
   ${parsed.evidence}

3. 인사이트 (Insights)
   ${parsed.insights}

4. 경영진 시사점 (Management Implications)
   ${parsed.implications}

5. 데이터 범위 (Data Coverage)
   ${parsed.coverage}`;
    } catch (e) {
        console.warn('[RAG Pipeline] Failed to parse JSON, formatting raw output manually:', e.message);

        let safeText = rawResponse.trim();
        // Remove conversational prefixes if any
        if (safeText.includes('데이터가 없습니다')) safeText = '검색된 데이터가 없습니다. ' + safeText;

        responseText = `[업무 현황 분석]

1. 요약 (Summary)
   ${safeText}

2. 근거 데이터 (Evidence)
   명확한 근거 도출 실패 (데이터 부족 또는 문맥 불일치)

3. 인사이트 (Insights)
   충분한 데이터가 제공되지 않아 상세 분석이 불가능합니다.

4. 경영진 시사점 (Management Implications)
   분석 대상에 대한 추가적인 데이터 수집 및 로깅 체계 점검이 필요합니다.

5. 데이터 범위 (Data Coverage)
   분석 불가 (해당 없음)`;
    }

    console.log(`[RAG Pipeline] Complete. Sources: ${finalResults.length}`);

    return {
        text: responseText,
        hasChart: isChartRequest && chartData && chartData.length > 0,
        chartData: (isChartRequest && chartData && chartData.length > 0) ? chartData : null,
        sources: finalResults.map(r => ({
            employee: r.payload.employee,
            department: r.payload.department,
            week: r.payload.week_start,
            score: (r.rerankerScore || r.score || 0).toFixed(3)
        }))
    };
}
