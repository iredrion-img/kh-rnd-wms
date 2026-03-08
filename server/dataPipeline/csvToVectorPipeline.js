/**
 * csvToVectorPipeline.js — End-to-End CSV Ingestion Pipeline
 *
 * Orchestrates the full data ingestion:
 *   CSV → Document Generation → bge-m3 Embedding → Qdrant Storage
 *
 * Uses sequential (one-by-one) embedding to avoid Ollama model state issues
 * with bge-m3 batch calls.
 */

import { processCSV } from './csvProcessor.js';
import { embedText, getEmbeddingDimension } from '../rag/embeddingService.js';
import { ensureCollection, upsertPoints, deleteCollection, getCollectionInfo } from '../rag/qdrantService.js';

const UPSERT_BATCH_SIZE = 64;

/**
 * Small delay to let Ollama stabilize between embedding calls
 */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Run the full CSV → Qdrant ingestion pipeline
 *
 * @param {string} csvFilePath - path to database_2026.csv
 * @param {boolean} rebuild - if true, delete and recreate collection
 */
export async function ingestCSV(csvFilePath, rebuild = false) {
    const startTime = Date.now();
    console.log('\n' + '═'.repeat(60));
    console.log('[Ingestion] Starting CSV → Qdrant ingestion pipeline...');
    console.log('═'.repeat(60));

    // Step 1: Process CSV into documents
    console.log('\n[Ingestion] Step 1/4 — Processing CSV...');
    const documents = processCSV(csvFilePath);

    // Step 2: Get embedding dimension & ensure collection
    console.log('\n[Ingestion] Step 2/4 — Initializing Qdrant collection...');
    const dim = await getEmbeddingDimension();
    console.log(`[Ingestion] Embedding dimension: ${dim}`);

    if (rebuild) {
        await deleteCollection();
    }
    await ensureCollection(dim);

    // Step 3: Embed documents one-by-one and collect points
    console.log(`\n[Ingestion] Step 3/4 — Embedding ${documents.length} documents with bge-m3 (sequential)...`);
    const points = [];
    let failed = 0;

    for (let i = 0; i < documents.length; i++) {
        try {
            const vector = await embedText(documents[i].text);
            points.push({
                id: documents[i].id,
                vector,
                payload: documents[i].payload
            });
        } catch (e) {
            failed++;
            if (failed <= 3) console.warn(`[Ingestion] Embed failed doc #${i}: ${e.message}`);
            await sleep(200); // let model recover
        }

        // Progress logging every 50 docs
        if ((i + 1) % 50 === 0 || i === documents.length - 1) {
            const pct = Math.round(((i + 1) / documents.length) * 100);
            console.log(`[Ingestion] Embedded ${i + 1}/${documents.length} (${pct}%) [${failed} failed]`);
        }
    }

    if (points.length === 0) {
        throw new Error('No documents were successfully embedded.');
    }

    // Step 4: Upsert to Qdrant
    console.log(`\n[Ingestion] Step 4/4 — Upserting ${points.length} vectors to Qdrant...`);
    await upsertPoints(points, UPSERT_BATCH_SIZE);

    // Summary
    let pointsCount = 'N/A';
    try { const ci = await getCollectionInfo(); pointsCount = ci?.points_count ?? points.length; } catch (e) { }
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n' + '═'.repeat(60));
    console.log(`[Ingestion] COMPLETE`);
    console.log(`  Documents: ${documents.length}`);
    console.log(`  Embedded:  ${points.length} (${failed} failed)`);
    console.log(`  Vectors:   ${pointsCount}`);
    console.log(`  Dimension: ${dim}`);
    console.log(`  Time:      ${elapsed}s`);
    console.log('═'.repeat(60) + '\n');

    return {
        documentCount: documents.length,
        embeddedCount: points.length,
        failedCount: failed,
        vectorCount: pointsCount,
        dimension: dim,
        elapsedSeconds: parseFloat(elapsed)
    };
}
