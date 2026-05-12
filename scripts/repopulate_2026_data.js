import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { startOfWeek, addWeeks, format, isSameDay } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const dbFile = path.join(rootDir, 'database_2026.csv');

// 1. Real Center Organization
const targetEmployees = [
    { name: '임문구 부장', department: '스마트 기술 개발팀' },
    { name: '김진희 부장', department: '스마트 기술 개발팀' },
    { name: '김경훈 과장', department: '스마트 기술 개발팀' },
    { name: '강수민 대리', department: '스마트 기술 개발팀' },
    { name: '이정선 대리', department: '스마트 기술 개발팀' },
    { name: '김하빈 사원', department: '스마트 기술 개발팀' },
    { name: '노유빈 사원', department: '스마트 기술 개발팀' },
    { name: '이충재 이사대우', department: '디지털 기술 연구팀' },
    { name: '박도해 차장', department: '디지털 기술 연구팀' },
    { name: '이동근 이사대우', department: '인프라 BIM팀' },
    { name: '나기태 부장', department: '인프라 BIM팀' },
    { name: '김기윤 부장', department: '인프라 BIM팀' },
    { name: '김동찬 차장', department: '인프라 BIM팀' },
    { name: '임규민 과장', department: '인프라 BIM팀' },
    { name: '강병주 과장', department: '인프라 BIM팀' },
    { name: '김동욱 이사대우', department: 'AI 응용팀' },
    { name: '장민욱 차장', department: 'AI 응용팀' },
    { name: '한형서 사원', department: 'AI 응용팀' }
];

// 2. Projects/Categories
const projects = [
    { name: 'AI 기반 WMS 고도화', code: 'A-D-001' },
    { name: 'BIM 자동화 프로세스 구축', code: 'B-I-001' },
    { name: '디지털 트윈 모니터링 시스템', code: 'D-T-001' },
    { name: '스마트 건설 기술 지원', code: 'S-C-001' },
    { name: '공통업무 및 행정', code: 'E-G-001' }
];

const startDate = new Date(2026, 0, 1); 
const today = new Date();
let currentWeekStart = startOfWeek(startDate, { weekStartsOn: 1 });

const dbHeader = 'employee,department,project_name,project_code,mon,tue,wed,thu,fri,sat,sun,total,week_start\n';
let dbContent = dbHeader;

// List of public holidays or common leave days for variety
const specificLeaveDays = ['2026-01-01', '2026-01-28', '2026-01-29', '2026-01-30', '2026-02-17', '2026-03-01', '2026-03-03'];

while (currentWeekStart <= today) {
    const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');

    targetEmployees.forEach(emp => {
        // Organic variety: Some people work on more projects, some less
        const numProjects = Math.floor(Math.random() * 3) + 2; 
        const shuffled = [...projects].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, numProjects);

        const dailyData = selected.map(() => ({ mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0, total: 0 }));
        
        ['mon', 'tue', 'wed', 'thu', 'fri'].forEach((dayKey, idx) => {
            const dayDate = new Date(currentWeekStart);
            dayDate.setDate(dayDate.getDate() + idx);
            const dateStr = format(dayDate, 'yyyy-MM-dd');

            // 1. Holiday/Leave Check (15% random leave chance + specific holidays)
            if (specificLeaveDays.includes(dateStr) || Math.random() < 0.1) {
                return; // 0 hours for this day
            }

            // 2. Base 8 hours + Random Overtime (0-4h)
            let dailyTotal = 8;
            if (Math.random() > 0.6) {
                dailyTotal += Math.floor(Math.random() * 5); // Overtime up to 4h
            }

            // 3. Distribute across projects
            let remaining = dailyTotal;
            for (let i = 0; i < selected.length; i++) {
                const hours = (i === selected.length - 1) ? remaining : Math.floor(Math.random() * (remaining + 1));
                dailyData[i][dayKey] = hours;
                remaining -= hours;
            }
        });

        selected.forEach((proj, i) => {
            const d = dailyData[i];
            const total = d.mon + d.tue + d.wed + d.thu + d.fri;
            if (total > 0) {
                dbContent += `${emp.name},${emp.department},${proj.name},${proj.code},${d.mon},${d.tue},${d.wed},${d.thu},${d.fri},0,0,${total},${weekStartStr}\n`;
            }
        });
    });

    currentWeekStart = addWeeks(currentWeekStart, 1);
}

fs.writeFileSync(dbFile, dbContent);
console.log(`Successfully generated ORGANIC 2026 test data with varied hours, overtime, and leave in ${dbFile}`);
