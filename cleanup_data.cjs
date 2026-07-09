const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const DB_FILE = path.join(DIR, 'database_2026.json');
const TASKS_FILE = path.join(DIR, 'weekly_tasks_2026.json');
const SCHEDULE_FILE = path.join(DIR, 'weekly_schedule.json');
const MEETING_FILE = path.join(DIR, 'meeting_overview.json');

function readJson(file) {
    if (!fs.existsSync(file)) return [];
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        console.error(`Failed to read ${file}:`, e);
        return [];
    }
}

function writeJson(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log(`Saved ${file} (${data.length} records)`);
}

function cleanDatabase() {
    let records = readJson(DB_FILE);
    const beforeCount = records.length;
    
    let filtered = [];
    for (const r of records) {
        if (!r.week_start || r.week_start < '2026-06-29') {
            continue; // Drop anything strictly before 2026-06-29
        }
        
        if (r.week_start === '2026-06-29') {
            // Drop mon(06/29) and tue(06/30)
            r.mon = "0";
            r.tue = "0";
            
            // Recalculate total
            const wed = parseFloat(r.wed) || 0;
            const thu = parseFloat(r.thu) || 0;
            const fri = parseFloat(r.fri) || 0;
            const sat = parseFloat(r.sat) || 0;
            const sun = parseFloat(r.sun) || 0;
            
            const total = wed + thu + fri + sat + sun;
            r.total = String(total);
            
            if (total > 0) {
                filtered.push(r);
            }
            // If total is 0, we drop the record.
        } else {
            // Keep 2026-07-06 and onwards
            filtered.push(r);
        }
    }
    
    writeJson(DB_FILE, filtered);
    console.log(`Database: Removed ${beforeCount - filtered.length} records.`);
}

function cleanTasksAndSchedules(file) {
    let records = readJson(file);
    const beforeCount = records.length;
    let filtered = [];
    
    for (const r of records) {
        // If end_date is present and it ended before July 1st, drop it
        if (r.end_date && r.end_date < '2026-07-01') {
            continue;
        }
        
        // If start_date is before July 1st
        if (r.start_date && r.start_date < '2026-07-01') {
            if (!r.end_date) {
                // One day event before July 1st -> drop
                continue;
            } else {
                // Spans across July 1st, adjust start date
                r.start_date = '2026-07-01';
                // Adjust week_start if it was based on old start_date
                // Since week of 2026-07-01 (Wed) is 2026-06-29
                r.week_start = '2026-06-29';
            }
        }
        
        // If no start_date (legacy fallback), check week_start
        if (!r.start_date && r.week_start) {
            if (r.week_start < '2026-06-29') {
                continue;
            }
        }
        
        filtered.push(r);
    }
    
    writeJson(file, filtered);
    console.log(`[${path.basename(file)}]: Removed ${beforeCount - filtered.length} records.`);
}

function cleanMeetingOverview() {
    let records = readJson(MEETING_FILE);
    const beforeCount = records.length;
    let filtered = [];
    
    for (const r of records) {
        if (!r.week || r.week < '2026-06-29') {
            continue;
        }
        if (r.week === '2026-06-29' && r.meeting_date && r.meeting_date < '2026-07-01') {
            continue;
        }
        filtered.push(r);
    }
    
    writeJson(MEETING_FILE, filtered);
    console.log(`Meetings: Removed ${beforeCount - filtered.length} records.`);
}

console.log("Starting data cleanup...");
cleanDatabase();
cleanTasksAndSchedules(TASKS_FILE);
cleanTasksAndSchedules(SCHEDULE_FILE);
cleanMeetingOverview();
console.log("Cleanup complete!");
