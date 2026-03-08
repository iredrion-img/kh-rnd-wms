/**
 * embeddingService.js — Embedding via Ollama
 *
 * Provides embedding generation using Ollama's /api/embed endpoint.
 * Uses nomic-embed-text (stable with Korean/English mixed text).
 * bge-m3 produces NaN for mixed Korean/English documents in Ollama.
 *
 * Input is sanitized (newlines → spaces) before embedding.
 */

const OLLAMA_URL = 'http://localhost:11434';
const EMBEDDING_MODEL = 'nomic-embed-text';

/**
 * Sanitize text for bge-m3: collapse newlines and excessive whitespace
 */
function sanitize(text) {
    return text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Embed a single text string using bge-m3
 * @param {string} text
 * @returns {Promise<number[]>} embedding vector
 */
export async function embedText(text) {
    const clean = sanitize(text);
    const res = await fetch(`${OLLAMA_URL}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: EMBEDDING_MODEL, input: clean })
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Embedding failed: ${res.status} ${body.slice(0, 100)}`);
    }
    const data = await res.json();
    return data.embeddings[0];
}

/**
 * Embed multiple texts in batch
 * @param {string[]} texts
 * @returns {Promise<number[][]>} array of embedding vectors
 */
export async function embedBatch(texts) {
    const cleaned = texts.map(sanitize);
    try {
        const res = await fetch(`${OLLAMA_URL}/api/embed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: EMBEDDING_MODEL, input: cleaned })
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        return data.embeddings;
    } catch (e) {
        // Fallback: embed one-by-one
        console.warn(`[Embedding] Batch failed (${e.message}), falling back to sequential.`);
        const results = [];
        for (const text of cleaned) {
            const r = await fetch(`${OLLAMA_URL}/api/embed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: EMBEDDING_MODEL, input: text })
            });
            if (!r.ok) throw new Error(`Sequential embed failed: ${r.status}`);
            const d = await r.json();
            results.push(d.embeddings[0]);
        }
        return results;
    }
}

/**
 * Get the embedding dimension (needed for Qdrant collection creation)
 * @returns {Promise<number>}
 */
export async function getEmbeddingDimension() {
    const testVec = await embedText('dimension test');
    return testVec.length;
}
