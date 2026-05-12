import { processData } from './dataProcessor.js';
import { embedText, getEmbeddingDimension } from '../rag/embeddingService.js';
import { ensureCollection, upsertPoints, deleteCollection, getCollectionInfo } from '../rag/qdrantService.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPSERT_BATCH_SIZE = 64;
const HASH_FILE = '.qdrant_hash';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getFileHash(filePath) {
    if (!fs.existsSync(filePath)) return '';
    const content = await fs.promises.readFile(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
}

function getCachedHash(dir) {
    const hashPath = path.join(dir, HASH_FILE);
    try {
        return fs.readFileSync(hashPath, 'utf-8').trim();
    } catch {
        return null;
    }
}

function saveCachedHash(dir, hash) {
    const hashPath = path.join(dir, HASH_FILE);
    fs.writeFileSync(hashPath, hash, 'utf-8');
}

async function hasExistingVectors() {
    try {
        const info = await getCollectionInfo();
        return (info?.points_count || 0) > 0;
    } catch {
        return false;
    }
}

export async function ingestData(jsonFilePath, rebuild = false) {
    const dataDir = path.dirname(path.resolve(jsonFilePath));

    if (!rebuild) {
        const currentHash = await getFileHash(jsonFilePath);
        const cachedHash = getCachedHash(dataDir);
        const vectorsExist = await hasExistingVectors();

        if (currentHash === cachedHash && vectorsExist) {
            console.log('\n[Qdrant] ✅ Data unchanged — skipping ingestion (cached)');
            const info = await getCollectionInfo();
            return {
                documentCount: 0,
                vectorCount: info?.points_count || 0,
                cached: true
            };
        }
    }

    const documents = processData(jsonFilePath);
    if (documents.length === 0) return { documentCount: 0, vectorCount: 0 };

    const dim = await getEmbeddingDimension();
    if (rebuild) await deleteCollection();
    await ensureCollection(dim);

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
            await sleep(200);
        }

        if ((i + 1) % 50 === 0 || i === documents.length - 1) {
            console.log(`[Ingestion] Embedded ${i + 1}/${documents.length}`);
        }
    }

    if (points.length > 0) {
        await upsertPoints(points, UPSERT_BATCH_SIZE);
        const currentHash = await getFileHash(jsonFilePath);
        saveCachedHash(dataDir, currentHash);
    }

    return {
        documentCount: documents.length,
        vectorCount: points.length,
        failedCount: failed
    };
}
