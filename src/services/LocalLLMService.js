// LocalLLMService.js
// Ollama API 등 로컬 구축된 LLM 서버와 통신하기 위한 서비스

const OLLAMA_DEFAULT_URL = 'http://localhost:11434/api/chat';
const DEFAULT_MODEL = 'llama3'; // 또는 사용자가 선호하는 로컬 모델 (예: qwen, mistral 등)

/**
 * 로컬 LLM에 메시지를 보내고 응답을 받아옵니다.
 * 데이터 시각화를 위한 특수 프롬프트를 함께 주입하여 정형화된 응답을 유도할 수 있습니다.
 */
export async function sendChatMessage(messages, model = DEFAULT_MODEL) {
    try {
        const response = await fetch(OLLAMA_DEFAULT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                stream: false,
            }),
        });

        if (!response.ok) {
            throw new Error(`LLM 서버 통신 에러: ${response.status}`);
        }

        const data = await response.json();
        return data.message.content;

    } catch (error) {
        console.warn("로컬 LLM 통신 실패, 기본/모의 응답으로 대체합니다.", error);
        // 개발 환경이나 LLM 서버가 꺼져있을 때를 대비한 Fallback (또는 에러 메시지 반환)
        return null;
    }
}

/**
 * 시각화 차트를 요구하는 요청인지 텍스트로 분석하는 헬퍼 함수
 * (실제로는 LLM 시스템 프롬프트를 통해 JSON 형태로 차트 데이터를 요구하는 것이 가장 좋습니다)
 */
export function analyzeChartRequest(responseText) {
    // 응답 텍스트 내에 특정 JSON 코드 블록(예: ```json ... ```)이나 시각화 키워드를 파싱할 수 있습니다.
    // 현재는 간단히 '차트', '시각화' 등의 텍스트가 포함되어 있는지 확인하는 예시입니다.
    const isChartRequest = responseText.includes('차트') ||
        responseText.includes('시각화') ||
        responseText.includes('보여드');

    // 차트 요청일 경우 반환할 모의 데이터 (실제로는 LLM 응답에서 추출)
    const MOCK_CHART_DATA = [
        { name: 'R&D센터', time: 120 },
        { name: '기술연구소', time: 90 },
        { name: '스마트기술개발팀', time: 150 },
        { name: '디지털기술연구팀', time: 80 },
    ];

    return {
        hasChart: isChartRequest,
        chartData: isChartRequest ? MOCK_CHART_DATA : null
    };
}
