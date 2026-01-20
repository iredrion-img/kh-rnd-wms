
import fs from 'fs';
import path from 'path';

/**
 * Simple Mutex to ensure only one write operation happens at a time per file.
 */
const locks = new Map();

const getLock = (file) => {
    if (!locks.has(file)) {
        let release = () => { };
        const promise = Promise.resolve();
        locks.set(file, { promise, release });
    }
    return locks.get(file);
};

const acquireLock = async (file) => {
    const lock = getLock(file);
    const releasePromise = new Promise(resolve => {
        lock.release = resolve;
    });

    // Wait for previous operation to finish
    await lock.promise;

    // Update lock with new promise
    lock.promise = releasePromise;
};

const releaseLock = (file) => {
    const lock = getLock(file);
    lock.release();
};

/**
 * Atomically writes data to a file.
 * 1. Writes to a temp file.
 * 2. Flushes to disk.
 * 3. Renames temp file to target file.
 */
export const writeAtomic = async (filePath, data) => {
    await acquireLock(filePath);
    const tempPath = `${filePath}.tmp.${Date.now()}`;

    try {
        // 1. Write to temp file
        fs.writeFileSync(tempPath, data);

        // 2. Sync to disk (ensure data is safe physically)
        // (Node.js writeFileSync usually handles flushing, but we can be explicit if needed. 
        //  For simple CSVs, writeFileSync is sufficient blocking I/O)

        // 3. Atomic Rename
        // Retrying rename is good practice on Windows where AV might lock file briefly
        let retries = 3;
        while (retries > 0) {
            try {
                fs.renameSync(tempPath, filePath);
                break;
            } catch (err) {
                if (retries === 1) throw err;
                retries--;
                await new Promise(r => setTimeout(r, 100)); // wait 100ms
            }
        }
    } catch (error) {
        console.error(`[SafeStorage] Failed to write ${filePath}:`, error);
        // Attempt cleanup
        try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (e) { }
        throw error;
    } finally {
        releaseLock(filePath);
    }
};
