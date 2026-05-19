import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const dbPath = path.join(rootDir, 'database_2026.json');
const schedulePath = path.join(rootDir, 'weekly_schedule.json');
const usersPath = path.join(rootDir, 'users.json');

if (!fs.existsSync(dbPath) || !fs.existsSync(usersPath)) {
    console.error('Database files not found. Make sure you run this script in the WMS root directory.');
    process.exit(1);
}

// 1. Load users to get all names and departments
const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));

// 2. Load database_2026.json
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// 3. Process database_2026.json
const weekStartTarget = '2026-04-27';

users.forEach(user => {
    const empName = user.name;
    const deptName = user.department;

    // Filter rows for this employee in the target week
    const empWeekRows = db.filter(r => r.employee === empName && r.week_start === weekStartTarget);

    let holidayRowExists = false;

    empWeekRows.forEach(row => {
        if (row.project_name === '공휴일') {
            row.fri = '8';
            // Recalculate total
            const mon = parseInt(row.mon || '0');
            const tue = parseInt(row.tue || '0');
            const wed = parseInt(row.wed || '0');
            const thu = parseInt(row.thu || '0');
            const fri = parseInt(row.fri || '0');
            const sat = parseInt(row.sat || '0');
            const sun = parseInt(row.sun || '0');
            row.total = String(mon + tue + wed + thu + fri + sat + sun);
            holidayRowExists = true;
        } else {
            // For other projects, wipe fri hours since it is a public holiday
            if (row.fri && row.fri !== '0') {
                row.fri = '0';
                // Recalculate total
                const mon = parseInt(row.mon || '0');
                const tue = parseInt(row.tue || '0');
                const wed = parseInt(row.wed || '0');
                const thu = parseInt(row.thu || '0');
                const fri = parseInt(row.fri || '0');
                const sat = parseInt(row.sat || '0');
                const sun = parseInt(row.sun || '0');
                row.total = String(mon + tue + wed + thu + fri + sat + sun);
            }
        }
    });

    if (!holidayRowExists) {
        // Create new '공휴일' row
        const newRow = {
            employee: empName,
            department: deptName,
            project_name: '공휴일',
            project_code: 'LEAVE',
            mon: '0',
            tue: '0',
            wed: '0',
            thu: '0',
            fri: '8',
            sat: '0',
            sun: '0',
            total: '8',
            week_start: weekStartTarget
        };
        db.push(newRow);
    }
});

// Save updated database_2026.json
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log('Successfully updated database_2026.json with May 1st holiday for all users!');

// 4. Update weekly_schedule.json
let schedules = [];
if (fs.existsSync(schedulePath)) {
    try {
        schedules = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));
    } catch (e) {
        schedules = [];
    }
}

// Remove any existing May 1st holiday schedule to avoid duplicates
schedules = schedules.filter(s => s.id !== 'holiday_may_1st_2026');

// Add the new global holiday schedule entry
const holidaySchedule = {
    id: 'holiday_may_1st_2026',
    schedule_type: '휴가',
    content: '공휴일',
    start_date: '2026-05-01',
    end_date: '2026-05-01',
    location: '',
    assignees: users.map(u => u.name).join(', '),
    week_start: weekStartTarget,
    year: '2026',
    created_at: new Date().toISOString().slice(0, 10)
};

schedules.push(holidaySchedule);

fs.writeFileSync(schedulePath, JSON.stringify(schedules, null, 2), 'utf8');
console.log('Successfully updated weekly_schedule.json with May 1st holiday entry!');
