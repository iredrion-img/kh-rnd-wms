import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { stringify } from 'csv-stringify/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, '..', 'users.csv');
const BACKUP_FILE = path.join(__dirname, '..', 'users_backup.csv');

console.log('==========================================');
console.log('      Kunhwa WMS - Data Repair (Robust)');
console.log('==========================================');

if (!fs.existsSync(USERS_FILE)) {
    console.error('Error: users.csv not found!');
    process.exit(1);
}

try {
    // 1. Read Data
    const content = fs.readFileSync(USERS_FILE, 'utf8');

    // 2. Backup
    fs.writeFileSync(BACKUP_FILE, content);
    console.log(`[Backup] Saved to users_backup.csv`);

    // 3. Manual Parsing (Resilient to bad CSV formatting)
    // Split by newlines handling both Windows (\r\n) and Unix (\n)
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');

    // Basic CSV Line Parser (assumes no quoted commas for this simple data)
    // format: id,name,department,password
    const header = lines[0].split(',').map(h => h.trim());
    console.log(`[Read] Header: ${header.join(', ')}`);
    console.log(`[Read] Parsing ${lines.length - 1} lines...`);

    const records = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split(',');

        // Pad with empty strings if missing columns
        const id = (parts[0] || '').trim();
        const name = (parts[1] || '').trim();
        const department = (parts[2] || '').trim();
        const password = (parts[3] || '').trim();

        if (id && name) {
            records.push({ id, name, department, password });
        } else {
            console.log(`[Skip] Empty or Invalid line #${i + 1}`);
        }
    }

    // 4. Deduplicate
    const uniqueUsers = new Map();
    let duplicateCount = 0;

    records.forEach(record => {
        const name = record.name;

        if (!uniqueUsers.has(name)) {
            uniqueUsers.set(name, record);
        } else {
            duplicateCount++;
            const existing = uniqueUsers.get(name);
            console.log(`[Fix] Removing duplicate for: ${name}`);

            // Keep the one with a password, or the newer one
            const existingHasPw = existing.password && existing.password.length > 0;
            const currentHasPw = record.password && record.password.length > 0;

            if (!existingHasPw && currentHasPw) {
                uniqueUsers.set(name, record);
            } else if (existingHasPw === currentHasPw) {
                if (record.id > existing.id) {
                    uniqueUsers.set(name, record);
                }
            }
        }
    });

    // 5. Write Back
    const cleanRecords = Array.from(uniqueUsers.values());
    const columns = ['id', 'name', 'department', 'password'];
    const output = stringify(cleanRecords, { header: true, columns: columns });

    fs.writeFileSync(USERS_FILE, output);

    console.log('------------------------------------------');
    console.log(`[Success] Repair Complete.`);
    console.log(`- Processed: ${records.length} records`);
    console.log(`- Duplicates Removed: ${duplicateCount}`);
    console.log(`- Final Count: ${cleanRecords.length} users`);
    console.log('------------------------------------------');

} catch (error) {
    console.error('Fatal Error:', error);
}
