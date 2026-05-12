
import fs from 'fs';
import path from 'path';

/**
 * Simple Mutex to ensure only one write operation happens at a time per file.
 */
const locks = new Map();

const queue = new Map();

/**
 * Acquires a lock for the given file path.
 * Returns a function to release the lock.
 */
const acquireLock = async (file) => {
    if (!queue.has(file)) {
        queue.set(file, Promise.resolve());
    }

    const previousPromise = queue.get(file);
    let resolveNext;
    const nextPromise = new Promise(resolve => {
        resolveNext = resolve;
    });

    // Update the queue to the next promise ASAP
    queue.set(file, nextPromise);

    // Wait for the previous lock owner to finish
    await previousPromise;

    // Return the release function
    return () => {
        resolveNext();
        // Cleanup map if no more waiters
        if (queue.get(file) === nextPromise) {
            queue.delete(file);
        }
    };
};

/**
 * Atomically writes data to a file.
 * 1. Writes to a temp file.
 * 2. Flushes to disk.
 * 3. Renames temp file to target file.
 */
export const writeAtomic = async (filePath, data) => {
    const release = await acquireLock(filePath);
    const tempPath = `${filePath}.tmp.${Date.now()}`;

    try {
        // 1. Write to temp file
        fs.writeFileSync(tempPath, data);

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
        release();
    }
};
