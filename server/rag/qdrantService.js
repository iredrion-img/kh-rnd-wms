/**
 * qdrantService.js — Qdrant Vector Database Client (REST API)
 *
 * Uses direct REST calls to avoid version mismatch between
 * @qdrant/js-client-rest v1.17 and Qdrant server v1.13
 */

const QDRANT_URL = 'http://localhost:6333';
const COLLECTION_NAME = 'wms_work_logs';

async function qdrantFetch(path, method = 'GET', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${QDRANT_URL}${path}`, opts);
    const data = await res.json();
    if (data.status === 'error') throw new Error(data.result?.error || 'Qdrant error');
    return data;
}

/**
 * Ensure the wms_work_logs collection exists
 */
export async function ensureCollection(vectorSize) {
    // Check existing collections
    const { result } = await qdrantFetch('/collections');
    if (result.collections.some(c => c.name === COLLECTION_NAME)) {
        console.log(`[Qdrant] Collection "${COLLECTION_NAME}" already exists.`);
        return;
    }

    // Create collection
    await qdrantFetch(`/collections/${COLLECTION_NAME}`, 'PUT', {
        vectors: { size: vectorSize, distance: 'Cosine' }
    });

    // Create payload indices
    const fields = [
        { name: 'employee', type: 'keyword' },
        { name: 'department', type: 'keyword' },
        { name: 'project_name', type: 'keyword' },
        { name: 'week_start', type: 'keyword' },
        { name: 'document_type', type: 'keyword' },
        { name: 'source', type: 'keyword' },
        { name: 'year', type: 'integer' },
        { name: 'month', type: 'integer' },
        { name: 'week_number', type: 'integer' }
    ];
    for (const f of fields) {
        try {
            await qdrantFetch(`/collections/${COLLECTION_NAME}/index`, 'PUT', {
                field_name: f.name,
                field_schema: f.type
            });
        } catch (e) { /* index may exist */ }
    }

    console.log(`[Qdrant] Collection "${COLLECTION_NAME}" created (dim=${vectorSize}, distance=Cosine).`);
}

/**
 * Upsert vectors with payloads in batches
 */
export async function upsertPoints(points, batchSize = 64) {
    for (let i = 0; i < points.length; i += batchSize) {
        const batch = points.slice(i, i + batchSize);
        await qdrantFetch(`/collections/${COLLECTION_NAME}/points?wait=true`, 'PUT', {
            points: batch.map(p => ({
                id: p.id,
                vector: p.vector,
                payload: p.payload
            }))
        });
        console.log(`[Qdrant] Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(points.length / batchSize)} (${batch.length} points)`);
    }
}

/**
 * Search vectors with optional metadata filter
 */
export async function searchVectors(queryVector, limit = 20, filter = null) {
    const body = {
        vector: queryVector,
        limit,
        with_payload: true,
        with_vector: false
    };
    if (filter) body.filter = filter;

    const { result } = await qdrantFetch(`/collections/${COLLECTION_NAME}/points/search`, 'POST', body);
    return result || [];
}

/**
 * Delete collection
 */
export async function deleteCollection() {
    try {
        await qdrantFetch(`/collections/${COLLECTION_NAME}`, 'DELETE');
        console.log(`[Qdrant] Collection "${COLLECTION_NAME}" deleted.`);
    } catch (e) { /* may not exist */ }
}

/**
 * Get collection info
 */
export async function getCollectionInfo() {
    const { result } = await qdrantFetch(`/collections/${COLLECTION_NAME}`);
    return result;
}
