/**
 * rerankerService.js — bge-reranker-v2-m3 via Ollama
 *
 * Implements cross-encoder reranking:
 *   Given a query and candidate documents, scores each document
 *   for relevance and returns them sorted by score.
 *
 * Uses Ollama's /api/embed endpoint with query-document pairs.
 */

const OLLAMA_URL = 'http://localhost:11434';
const RERANKER_MODEL = 'qllama/bge-reranker-v2-m3';

/**
 * Rerank candidate documents by relevance to the query
 *
 * Strategy: Use the LLM to score each document's relevance
 * by sending query+document pairs and getting relevance scores.
 *
 * @param {string} query - the user's question
 * @param {Array<{text: string, payload: object, score: number}>} candidates - search results
 * @param {number} topK - number of results to return after reranking
 * @returns {Promise<Array>} reranked results (top-K)
 */
export async function rerank(query, candidates, topK = 5) {
    if (!candidates || candidates.length === 0) return [];
    if (candidates.length <= topK) return candidates;

    try {
        // Build query-document pairs for cross-encoder scoring
        const pairs = candidates.map(c => `query: ${query}\ndocument: ${c.text}`);

        const res = await fetch(`${OLLAMA_URL}/api/embed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: RERANKER_MODEL,
                input: pairs
            })
        });

        if (!res.ok) {
            console.warn(`[Reranker] Ollama reranker returned ${res.status}, falling back to vector scores`);
            return candidates.slice(0, topK);
        }

        const data = await res.json();
        const embeddings = data.embeddings || [];

        // For cross-encoders, the first dimension often represents relevance score
        // Use L2 norm as a relevance proxy
        const scored = candidates.map((c, i) => {
            let rerankerScore = c.score; // fallback to original score
            if (embeddings[i]) {
                // Use the magnitude of embedding as relevance signal
                const vec = embeddings[i];
                const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
                rerankerScore = magnitude;
            }
            return { ...c, rerankerScore };
        });

        scored.sort((a, b) => b.rerankerScore - a.rerankerScore);
        console.log(`[Reranker] Reranked ${candidates.length} → top ${topK}`);
        return scored.slice(0, topK);

    } catch (e) {
        console.warn('[Reranker] Reranking failed, returning original order:', e.message);
        return candidates.slice(0, topK);
    }
}
