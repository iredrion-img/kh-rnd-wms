import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, '../database.csv');

console.log('Cleaning database:', DB_FILE);

try {
    const content = fs.readFileSync(DB_FILE, 'utf8');
    const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    });

    console.log(`Total records before cleanup: ${records.length}`);

    // Deduplication Logic: Keep only the LAST set of records for each (Employee + Week + Project) combo?
    // Actually, "Overwrite" logic implies we only want ONE set of records per (Employee + Week).

    // Group by Employee + Week
    const grouped = {};

    records.forEach(record => {
        const key = `${record.employee}|${record.week_start}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(record);
    });

    let cleanedRecords = [];
    Object.keys(grouped).forEach(key => {
        const groupRecords = grouped[key];
        // If duplicates exist, we assume the duplicates are appended to the end.
        // The last N records (where N = number of categories, e.g., 5) should be the valid ones.
        // However, "Total" logic might vary if partial updates happened?
        // Safest assumption: The overwrite logic intended 5 rows per week.

        // Detailed check: If we have multiple entries for "AI" in the same week for same user, take the last one.
        const projectMap = {};
        groupRecords.forEach(rec => {
            projectMap[rec.project_name] = rec; // Latest overwrite previous
        });

        cleanedRecords.push(...Object.values(projectMap));
    });

    console.log(`Total records after cleanup: ${cleanedRecords.length}`);

    const columns = ['employee', 'department', 'project_name', 'project_code', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'total', 'week_start'];
    const csvString = stringify(cleanedRecords, { header: true, columns: columns });

    fs.writeFileSync(DB_FILE, csvString);
    console.log('Database cleaned successfully.');

} catch (error) {
    console.error('Cleanup failed:', error);
}
