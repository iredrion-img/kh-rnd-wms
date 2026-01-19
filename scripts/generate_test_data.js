import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { startOfWeek, addWeeks, format } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const usersFile = path.join(rootDir, 'users.csv');
const dbFile = path.join(rootDir, 'database.csv');

// 1. Define 5 Mock Employees
const newEmployees = [
    { id: '1768537000001', name: '박지수', department: '인프라BIM팀' },
    { id: '1768537000002', name: '이민호', department: '기술연구소' },
    { id: '1768537000003', name: '정수빈', department: 'AI응용팀' },
    { id: '1768537000004', name: '한태양', department: '디지털기술개발팀' },
    { id: '1768537000005', name: '강서연', department: 'R&D센터' }
];

// 2. Append Employees to users.csv
// Read existing to check for duplicates (avoiding for simplicity, just appending)
// Assuming header exists.
let usersContent = '';
// Only append if file exists and has content, otherwise write header?
// But we know it exists.
// We'll just append.
const usersToAppend = newEmployees.map(e => `${e.id},${e.name},${e.department}`).join('\n') + '\n';
fs.appendFileSync(usersFile, usersToAppend);
console.log('Added 5 employees to users.csv');

// 3. Generate 2025 Data
const projects = ['AI', 'BIM', 'Digital Technology', 'Smart R&D', '기타 (Etc)'];
const startDate = new Date(2025, 0, 1); // Jan 1, 2025
// Find the first Monday of 2025's first week (or the week containing Jan 1)
let currentWeekStart = startOfWeek(startDate, { weekStartsOn: 1 });

// We want to cover all of 2025. Let's go for 53 weeks to be safe.
const weeksToGenerate = 53;
let dbContentToAppend = '';

for (let i = 0; i < weeksToGenerate; i++) {
    const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');

    newEmployees.forEach(emp => {
        // Pick 1-3 random projects for this user this week
        const numProjects = Math.floor(Math.random() * 3) + 1;
        const shuffledProjects = [...projects].sort(() => 0.5 - Math.random()).slice(0, numProjects);

        shuffledProjects.forEach(proj => {
            // Generate random hours for Mon-Fri (0-8), Sat-Sun (0)
            const mon = Math.floor(Math.random() * 9);
            const tue = Math.floor(Math.random() * 9);
            const wed = Math.floor(Math.random() * 9);
            const thu = Math.floor(Math.random() * 9);
            const fri = Math.floor(Math.random() * 9);
            const sat = 0;
            const sun = 0;
            const total = mon + tue + wed + thu + fri + sat + sun;

            if (total > 0) {
                // employee,department,project_name,project_code,mon,tue,wed,thu,fri,sat,sun,total,week_start
                const line = `${emp.name},${emp.department},${proj},,${mon},${tue},${wed},${thu},${fri},${sat},${sun},${total},${weekStartStr}`;
                dbContentToAppend += line + '\n';
            }
        });
    });

    currentWeekStart = addWeeks(currentWeekStart, 1);
}

fs.appendFileSync(dbFile, dbContentToAppend);
console.log(`Added test data for 2025 (${weeksToGenerate} weeks) to database.csv`);
