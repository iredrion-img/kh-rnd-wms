import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { stringify } from 'csv-stringify/sync';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to users.csv (assuming script is in /scripts/ and users.csv is in root)
const USERS_FILE = path.join(__dirname, '..', 'users.csv');
const BACKUP_FILE = path.join(__dirname, '..', 'users_backup.csv');

console.log('==========================================');
console.log('      Kunhwa WMS - Data Cleanup Tool');
console.log('==========================================');

if (!fs.existsSync(USERS_FILE)) {
    console.error('Error: users.csv not found!');
    process.exit(1);
}

try {
    // 1. Read Data
    const content = fs.readFileSync(USERS_FILE, 'utf8');
    const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    });

    console.log(`[Read] Found ${records.length} user records.`);

    // 2. Backup
    fs.writeFileSync(BACKUP_FILE, content);
    console.log(`[Backup] Original file saved to users_backup.csv`);

    // 3. Process & Deduplicate
    const uniqueUsers = new Map();

    records.forEach(record => {
        const name = record.name;

        if (!uniqueUsers.has(name)) {
            uniqueUsers.set(name, record);
        } else {
            const existing = uniqueUsers.get(name);
            console.log(`[Duplicate] Found duplicate for: ${name}`);

            // Logic: Prefer entry with password, then latest ID
            const existingHasPw = existing.password && existing.password.trim().length > 0;
            const currentHasPw = record.password && record.password.trim().length > 0;

            if (!existingHasPw && currentHasPw) {
                console.log(`   -> Replaced with entry having password.`);
                uniqueUsers.set(name, record);
            } else if (existingHasPw === currentHasPw) {
                // If both have password or both don't, take the newer one (larger ID)
                if (record.id > existing.id) {
                    console.log(`   -> Replaced with newer entry.`);
                    uniqueUsers.set(name, record);
                } else {
                    console.log(`   -> Kept existing (newer).`);
                }
            } else {
                console.log(`   -> Ignored (Existing has password).`);
            }
        }
    });

    // 4. Check for Passwordless Users
    const finalRecords = Array.from(uniqueUsers.values());
    let fixedCount = 0;

    const cleanedRecords = finalRecords.map(user => {
        if (!user.password || user.password.trim() === '') {
            // OPTIONAL: Set default password or just warn?
            // For now, let's keep them but warn.
            console.warn(`[Warning] User '${user.name}' has NO password. They cannot login.`);
        }
        return user;
    });

    // 5. Write Back
    const columns = ['id', 'name', 'department', 'password'];
    const output = stringify(cleanedRecords, { header: true, columns: columns });
    fs.writeFileSync(USERS_FILE, output);

    console.log('------------------------------------------');
    console.log(`[Done] Cleanup Complete.`);
    console.log(`Original: ${records.length} -> Cleaned: ${cleanedRecords.length}`);
    console.log(`Removed ${records.length - cleanedRecords.length} duplicates.`);
    console.log('------------------------------------------');

} catch (error) {
    console.error('Fatal Error:', error);
}
