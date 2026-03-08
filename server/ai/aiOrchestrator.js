/**
 * aiOrchestrator.js — HANA AI Multi-Agent Orchestrator
 *
 * Pipeline:
 *   question → intent classification → agent selection → data query → LLM call → response formatting
 *
 * Agents:
 *   1. Dispatcher        — 질문 분류 (LLM 기반)
 *   2. Worklog Analyst   — 근무 데이터 분석
 *   3. Executive Reporter — 상급자 보고서 생성
 *   4. Policy QA          — 규정/지침 RAG (향후 확장)
 *
 * 기존 ragService.js는 유지하며, VectorStore와 LLM 인프라를 재사용합니다.
 */

import { ChatOllama } from "@langchain/ollama";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { retrieve } from '../rag/retrievalPipeline.js';
import { chatWithRag } from '../../ragService.js'; // legacy fallback

// ─────────────────────────────────────────────
//  LLM 인스턴스 (재사용)
// ─────────────────────────────────────────────
const createLLM = (temperature = 0.2, maxRetries = 2) =>
    new ChatOllama({ model: "qwen2.5:7b", temperature, maxRetries });

// ─────────────────────────────────────────────
//  AGENT 1 — Dispatcher (Intent Classification)
// ─────────────────────────────────────────────

const INTENT_CATEGORIES = [
    'worklog_query',
    'comparison',
    'trend_analysis',
    'report_generation',
    'policy_question'
];

const DISPATCHER_PROMPT = ChatPromptTemplate.fromMessages([
    ["system", `당신은 R&D 센터 AI 시스템의 질문 분류기입니다.
사용자의 질문을 분석하여 아래 5가지 카테고리 중 **정확히 하나**로 분류하세요.

카테고리:
1. "worklog_query" — 특정 직원/팀/기간의 근무시간, 프로젝트 투입, 초과근무, 업무 현황 조회
2. "comparison" — 팀 간 비교, 직원 간 비교, 기간 간 비교 (예: "A팀과 B팀 비교", "1월 vs 2월")
3. "trend_analysis" — 시간 흐름에 따른 변화/추세 분석 (예: "최근 3주간 추이", "업무 증가 추세")
4. "report_generation" — 보고서/요약 작성 요청 (예: "주간보고 작성", "경영진 보고")
5. "policy_question" — 사내 규정, 근무 지침, 휴가 정책, 조직 규칙 관련 질문

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트를 포함하지 마세요.
{{"intent": "카테고리명", "confidence": 0.0~1.0, "keywords": ["핵심키워드1", "핵심키워드2"]}}`],
    ["human", "{question}"]
]);

async function dispatchIntent(question) {
    try {
        const llm = createLLM(0, 1); // temp=0, 정확한 분류
        const chain = DISPATCHER_PROMPT.pipe(llm).pipe(new StringOutputParser());
        const raw = await chain.invoke({ question });

        console.log(`[Dispatcher] Raw LLM output: ${raw.trim().slice(0, 200)}`);

        // JSON 추출 (LLM이 마크다운 코드블록으로 감쌀 수 있음)
        const jsonMatch = raw.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const intent = INTENT_CATEGORIES.includes(parsed.intent)
                ? parsed.intent
                : 'worklog_query'; // fallback
            return {
                intent,
                confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
                keywords: parsed.keywords || []
            };
        }
    } catch (e) {
        console.warn('[Dispatcher] 분류 실패, fallback:', e.message);
    }

    // Fallback: 키워드 기반 간이 분류
    return keywordFallbackClassify(question);
}

function keywordFallbackClassify(question) {
    const q = question.toLowerCase();
    if (q.includes('보고') || q.includes('report') || q.includes('요약') || q.includes('작성'))
        return { intent: 'report_generation', confidence: 0.6, keywords: [] };
    if (q.includes('비교') || q.includes('vs') || q.includes('차이'))
        return { intent: 'comparison', confidence: 0.6, keywords: [] };
    if (q.includes('추세') || q.includes('추이') || q.includes('변화') || q.includes('trend'))
        return { intent: 'trend_analysis', confidence: 0.6, keywords: [] };
    if (q.includes('규정') || q.includes('정책') || q.includes('지침') || q.includes('규칙') || q.includes('연차') || q.includes('휴가'))
        return { intent: 'policy_question', confidence: 0.6, keywords: [] };
    return { intent: 'worklog_query', confidence: 0.5, keywords: [] };
}

// ─────────────────────────────────────────────
//  AGENT 2 — Worklog Analyst
// ─────────────────────────────────────────────

const WORKLOG_ANALYST_PROMPT = ChatPromptTemplate.fromMessages([
    ["system", `당신은 R&D 센터 업무 데이터 분석 전문 AI '하나(HANA)'입니다.
반드시 한국어로 답변하세요.

분석 원칙:
1. 숫자는 반드시 아래 제공된 [문맥 데이터]에서 직접 계산. 추정 금지.
2. 주 40시간 초과 = 초과근무. 초과근무 발견 시 반드시 언급.
3. 팀/개인 분석 시 최대·최소·평균 제시.
4. 시각화 요청 시 "말씀하신 데이터를 바탕으로 차트를 준비했습니다." 포함.

주요 지표:
- total_hours: 총 업무시간
- project_distribution: 프로젝트별 시간 분포
- user_hours: 직원별 업무시간
- overtime: 초과근무 시간 (주 40시간 초과분)

[문맥 데이터 시작]
{context}
[문맥 데이터 종료]`],
    ["human", "{question}"]
]);

async function worklogAnalystExecute(question, messageHistory, intentResult) {
    // Qdrant 기반 RAG 파이프라인 사용
    try {
        const result = await retrieve(question, messageHistory, { intentResult });
        return {
            text: result.text,
            hasChart: result.hasChart,
            chartData: result.chartData,
            agentUsed: 'worklog_analyst',
            structuredData: {
                source: 'qdrant_rag',
                sources: result.sources,
                chartAvailable: result.hasChart
            }
        };
    } catch (e) {
        console.warn('[Worklog Analyst] Qdrant pipeline failed, using legacy ragService:', e.message);
        const ragResult = await chatWithRag(messageHistory, question);
        return {
            text: ragResult.text,
            hasChart: ragResult.hasChart,
            chartData: ragResult.chartData,
            agentUsed: 'worklog_analyst_fallback'
        };
    }
}

// ─────────────────────────────────────────────
//  AGENT 3 — Executive Reporter
// ─────────────────────────────────────────────

const REPORTER_PROMPT = ChatPromptTemplate.fromMessages([
    ["system", `당신은 R&D 센터 경영진을 위한 보고서 작성 전문 AI '하나(HANA)'입니다.
반드시 한국어로 답변하세요.

보고서 작성 원칙:
1. 아래 정형화된 4-섹션 구조로 작성하세요.
2. 전주/전월 대비 변화가 있으면 반영하세요.
3. 위험 신호 (초과근무 급증, 인력 편중 등) 우선 강조하세요.
4. 구체적 숫자와 % 사용, 모호한 표현 금지.
5. 데이터에 내용이 전혀 없다면 "해당 기간의 데이터가 없습니다."라고 답변.

출력 구조:
📋 결론: (핵심 요약 1~2줄)
📊 근거수치: (주요 숫자 나열)
💡 해석: (데이터 의미 해석)
⚠️ 확인필요: (추가 확인 또는 주의 사항)

시각화 요청 시 "말씀하신 데이터를 바탕으로 차트를 준비했습니다." 포함.

[문맥 데이터 시작]
{context}
[문맥 데이터 종료]`],
    ["human", "{question}"]
]);

async function executiveReporterExecute(question, messageHistory, intentResult) {
    // Step 1: Qdrant RAG로 데이터 수집
    let ragResult;
    try {
        ragResult = await retrieve(question, messageHistory, { intentResult });
    } catch (e) {
        console.warn('[Executive Reporter] Qdrant failed, using legacy:', e.message);
        ragResult = await chatWithRag(messageHistory, question);
    }

    // Step 2: 보고서 형식으로 LLM 재호출
    try {
        const llm = createLLM(0.3);
        const chain = REPORTER_PROMPT.pipe(llm).pipe(new StringOutputParser());

        const reportText = await chain.invoke({
            context: ragResult.text,
            question: `다음 질문에 대해 상급자 보고용 형식으로 작성해주세요:\n${question}`
        });

        console.log('[Executive Reporter] 보고서 생성 완료');

        return {
            text: reportText,
            hasChart: ragResult.hasChart,
            chartData: ragResult.chartData,
            agentUsed: 'executive_reporter',
            reportType: 'executive_summary'
        };
    } catch (e) {
        console.warn('[Executive Reporter] 보고서 생성 실패:', e.message);
        return {
            text: ragResult.text,
            hasChart: ragResult.hasChart,
            chartData: ragResult.chartData,
            agentUsed: 'executive_reporter_fallback'
        };
    }
}

// ─────────────────────────────────────────────
//  AGENT 4 — Policy QA (Stub — 향후 확장)
// ─────────────────────────────────────────────

async function policyQAExecute(question) {
    return {
        text: '현재 사내 규정/지침 문서가 시스템에 등록되지 않았습니다.\n' +
            '규정 관련 질문은 담당 부서에 문의해 주세요.\n\n' +
            '💡 이 기능은 향후 규정 문서가 등록되면 활성화됩니다.',
        hasChart: false,
        chartData: null,
        agentUsed: 'policy_qa',
        reportType: null
    };
}

// ─────────────────────────────────────────────
//  Orchestrator — Main Entry Point
// ─────────────────────────────────────────────

/**
 * handleQuestion — AI 오케스트레이터 진입점
 *
 * @param {Array} messageHistory - 대화 이력 [{sender, text}]
 * @param {string} question      - 사용자 질문
 * @returns {Object}             - {text, hasChart, chartData, intent, agentUsed, ...}
 */
export async function handleQuestion(messageHistory, question) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`[Orchestrator] 질문 수신: "${question.slice(0, 80)}..."`);
    console.log(`${'═'.repeat(60)}`);

    // ── Phase 1: Intent Classification ──
    console.log('[Orchestrator] Phase 1 — Intent Classification...');
    const intentResult = await dispatchIntent(question);
    console.log(`[Orchestrator] 분류 결과: intent=${intentResult.intent}, confidence=${intentResult.confidence}`);

    // ── Phase 2: Agent Selection & Execution ──
    console.log(`[Orchestrator] Phase 2 — Agent Execution (${intentResult.intent})...`);

    let agentResponse;

    switch (intentResult.intent) {
        case 'report_generation':
            agentResponse = await executiveReporterExecute(question, messageHistory, intentResult);
            break;

        case 'policy_question':
            agentResponse = await policyQAExecute(question);
            break;

        case 'worklog_query':
        case 'comparison':
        case 'trend_analysis':
        default:
            agentResponse = await worklogAnalystExecute(question, messageHistory, intentResult);
            break;
    }

    // ── Phase 3: Response Formatting ──
    const response = {
        text: agentResponse.text,
        hasChart: agentResponse.hasChart || false,
        chartData: agentResponse.chartData || null,
        // 확장 메타데이터 (프론트엔드 상위 호환)
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        agentUsed: agentResponse.agentUsed || 'unknown',
        reportType: agentResponse.reportType || null
    };

    console.log(`[Orchestrator] 응답 완료 — agent=${response.agentUsed}, chart=${response.hasChart}`);
    console.log(`${'─'.repeat(60)}\n`);

    return response;
}
