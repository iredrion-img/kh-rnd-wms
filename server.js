import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto'; // Import crypto for webhook signature verification
import { execFile } from 'child_process'; // Import for deploy script execution
import { writeAtomic } from './src/utils/safeStorage.js';
import { initializeVectorStore, chatWithRag } from './ragService.js';
import { handleQuestion } from './server/ai/aiOrchestrator.js';
import { ingestData } from './server/dataPipeline/dataToVectorPipeline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;



// --- CONFIG & PATHS ---
const USERS_FILE = path.join(__dirname, 'users.json');
const BACKUP_DIR = path.join(__dirname, 'backups');

const getDbFile = (year) => {
    const y = year || new Date().getFullYear();
    return path.join(__dirname, `database_${y}.json`);
};

const getWeeklyTasksFile = (year) => path.join(__dirname, `weekly_tasks_${year || new Date().getFullYear()}.json`);
const PROJECTS_FILE = path.join(__dirname, 'projects.json');
const SCHEDULE_FILE = path.join(__dirname, 'weekly_schedule.json');
const MEETING_OVERVIEW_FILE = path.join(__dirname, 'meeting_overview.json');

// --- HELPERS ---
const readJsonResilient = (filePath) => {
    if (!fs.existsSync(filePath)) return [];
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content.trim()) return [];
        return JSON.parse(content);
    } catch (e) {
        console.error(`[JSON Error] Failed to read ${filePath}:`, e);
        return [];
    }
};

// --- CACHE ---
let weeksCache = new Set();

const refreshWeeksCache = () => {
    try {
        const weeks = new Set();
        const files = fs.readdirSync(__dirname).filter(f => f.startsWith('weekly_tasks_') && f.endsWith('.json'));
        files.forEach(f => {
            const records = readJsonResilient(path.join(__dirname, f));
            records.forEach(r => { if (r.week_start) weeks.add(r.week_start); });
        });
        
        // Also check schedule file
        const scheduleRecords = readJsonResilient(SCHEDULE_FILE);
        scheduleRecords.forEach(r => { if (r.week_start) weeks.add(r.week_start); });

        weeksCache = weeks;
        console.log(`[Cache] Weeks cache refreshed: ${weeks.size} weeks found.`);
    } catch (e) {
        console.error('[Cache] Failed to refresh weeks cache:', e);
    }
};

// --- INITIALIZATION ---
const currentYear = new Date().getFullYear();

// Ensure weekly files exist
const currentWeeklyFile = getWeeklyTasksFile(currentYear);
if (!fs.existsSync(currentWeeklyFile)) fs.writeFileSync(currentWeeklyFile, '[]');
if (!fs.existsSync(PROJECTS_FILE)) fs.writeFileSync(PROJECTS_FILE, '[]');
if (!fs.existsSync(SCHEDULE_FILE)) fs.writeFileSync(SCHEDULE_FILE, '[]');
if (!fs.existsSync(MEETING_OVERVIEW_FILE)) fs.writeFileSync(MEETING_OVERVIEW_FILE, '[]');

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

refreshWeeksCache();

// Initialize current year DB if not exists
const currentDb = getDbFile(currentYear); // e.g., database_2026.json

if (!fs.existsSync(currentDb)) {
    console.log(`[Init] Creating fresh database for ${currentYear}: ${currentDb}`);
    fs.writeFileSync(currentDb, '[]');
}

// Initialize Users DB if not exists
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, '[]');
}

// --- BACKUP LOGIC ---
const performBackup = () => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 10); // YYYY-MM-DD
        console.log(`[Backup] Starting backup ${timestamp}...`);

        // Create daily subfolder
        const dailyBackupDir = path.join(BACKUP_DIR, timestamp);
        if (!fs.existsSync(dailyBackupDir)) {
            fs.mkdirSync(dailyBackupDir);
        }

        // Backup all relevant JSON files (database, users, circulation, projects, meeting, weekly)
        const files = fs.readdirSync(__dirname);
        files.forEach(file => {
            if (file.endsWith('.json') && !file.startsWith('package') && file !== 'jsconfig.json') {
                // Save files inside the daily subfolder without the date prefix
                fs.copyFileSync(path.join(__dirname, file), path.join(dailyBackupDir, file));
            }
        });

        // Update last backup marker
        fs.writeFileSync(path.join(BACKUP_DIR, '.last_backup'), new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
        return true;
    } catch (error) {
        console.error('[Backup] Failed:', error);
        return false;
    }
};

// Startup Check: Daily Backup
const checkStartupBackup = () => {
    const markerFile = path.join(BACKUP_DIR, '.last_backup');
    const currentDay = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    if (!fs.existsSync(markerFile)) {
        console.log(`[Startup] No backup found. Running initial backup...`);
        performBackup();
    } else {
        const lastBackup = fs.readFileSync(markerFile, 'utf8').trim();
        if (currentDay !== lastBackup) {
            console.log(`[Startup] New day detected (${currentDay}). Running daily backup...`);
            performBackup();
        } else {
            console.log(`[Startup] Daily backup already performed for ${currentDay}.`);
        }
    }
};

checkStartupBackup();

// 주기적으로 날짜 변경을 확인하여 백업 수행 (매 1시간마다 확인)
setInterval(() => {
    checkStartupBackup();
}, 60 * 60 * 1000);

// --- RAG VECTOR STORE INITIALIZATION ---
// initializeVectorStore(currentDb); // Legacy in-memory VectorStore (fallback)

// --- GLOBAL EXCEPTION HANDLERS ---
process.on('uncaughtException', (err) => {
    console.error('\n[Global] Uncaught Exception preventing crash:', err.message || err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('\n[Global] Unhandled Promise Rejection preventing crash:', reason?.message || reason);
});

// --- QDRANT RAG INITIALIZATION ---
/*
(async () => {
    try {
        console.log('[Qdrant] Starting Qdrant ingestion pipeline...');
        const result = await ingestData(currentDb, false);
        console.log(`[Qdrant] Ingestion complete: ${result.documentCount} docs, ${result.vectorCount} vectors`);
    } catch (e) {
        console.warn('[Qdrant] Ingestion failed (will use legacy fallback):', e.message || e);
    }
})().catch(err => {
    console.error('[Qdrant] Critical async failure caught at IIFE level:', err.message || err);
});
*/

// --- MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json({
    verify: (req, _res, buf) => {
        // Store raw body for webhook signature verification
        req.rawBody = buf;
    }
}));

// --- EXCLUDED VALUES (Suggetion Cleaning) ---
const EXCLUDED_VALUES_FILE = path.join(__dirname, 'excluded_values.json');

const readExcludedValues = () => {
    if (!fs.existsSync(EXCLUDED_VALUES_FILE)) return { method_details: [] };
    try {
        return JSON.parse(fs.readFileSync(EXCLUDED_VALUES_FILE, 'utf8'));
    } catch (e) {
        return { method_details: [] };
    }
};

app.get('/api/excluded-values', (req, res) => {
    res.json(readExcludedValues());
});

app.post('/api/exclude-value', async (req, res) => {
    try {
        const { type, value } = req.body;
        if (!type || !value) return res.status(400).json({ error: 'Type and value are required' });
        
        const excluded = readExcludedValues();
        if (!excluded[type]) excluded[type] = [];
        if (!excluded[type].includes(value)) {
            excluded[type].push(value);
            await fs.promises.writeFile(EXCLUDED_VALUES_FILE, JSON.stringify(excluded, null, 2));
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: '제외 목록 저장 실패' });
    }
});


// --- USER API ---
app.post('/api/login', (req, res) => {
    try {
        const { name, password } = req.body;
        if (!name || !password) return res.status(400).json({ error: '정보가 누락되었습니다.' });

        const users = readJsonResilient(USERS_FILE);
        const cleanInputName = name.trim().replace(/\s+/g, '');

        // Match by name (lenient)
        const user = users.find(u =>
            u.name.trim().replace(/\s+/g, '') === cleanInputName &&
            u.password.trim() === password.trim()
        );

        if (user) {
            const { password, ...safeUser } = user;
            res.json({ success: true, user: safeUser });
        } else {
            res.status(401).json({ success: false, message: '이름 또는 비밀번호가 일치하지 않습니다.' });
        }
    } catch (error) {
        res.status(500).json({ error: '로그인 도중 오류가 발생했습니다.' });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        let { name, department, password, role } = req.body;
        name = name.trim();
        department = department.trim();
        role = (role || 'member').trim();

        const users = readJsonResilient(USERS_FILE);
        if (users.some(u => u.name.trim().replace(/\s+/g, '') === name.replace(/\s+/g, ''))) {
            return res.status(409).json({ success: false, message: '이미 존재하는 이름입니다.' });
        }

        const id = Date.now().toString();
        const newUser = { id, name, department, password, role };
        users.push(newUser);
        await writeAtomic(USERS_FILE, JSON.stringify(users, null, 2));

        res.json({ success: true, user: { id, name, department, role } });
    } catch (error) {
        res.status(500).json({ error: '사용자 추가 실패' });
    }
});

app.get('/api/users', (req, res) => {
    const users = readJsonResilient(USERS_FILE);
    res.json(users.map(({ password, ...u }) => ({ ...u, role: u.role || 'member' })));
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let { name, department, password, role } = req.body;
        name = name ? name.trim() : undefined;
        department = department ? department.trim() : undefined;

        const users = readJsonResilient(USERS_FILE);
        const userIndex = users.findIndex(u => u.id === id);

        if (userIndex === -1) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }

        if (name) users[userIndex].name = name;
        if (department) users[userIndex].department = department;
        if (password && password.trim()) users[userIndex].password = password.trim();
        if (role) users[userIndex].role = role.trim();
        if (!users[userIndex].role) users[userIndex].role = 'member';

        await writeAtomic(USERS_FILE, JSON.stringify(users, null, 2));

        const { password: _, ...updatedUser } = users[userIndex];
        res.json({ success: true, user: { ...updatedUser, role: updatedUser.role || 'member' } });
    } catch (error) {
        console.error('Update User Error:', error);
        res.status(500).json({ error: '사용자 정보 수정 실패' });
    }
});

// --- TIMESHEET API ---
app.get('/api/timesheets', (req, res) => {
    try {
        const { year } = req.query;
        let records = [];

        if (year) {
            // Specific year
            const dbFile = getDbFile(year);
            if (fs.existsSync(dbFile)) {
                records = readJsonResilient(dbFile);
            }
        } else {
            // Load ALL years (dashboard aggregation)
            const files = fs.readdirSync(__dirname).filter(f => f.startsWith('database_') && f.endsWith('.json') && !f.includes('sample'));
            files.forEach(file => {
                const fileRecords = readJsonResilient(path.join(__dirname, file));
                records = [...records, ...fileRecords];
            });
        }
        res.json(records);
    } catch (error) {
        console.error('API Error in /api/timesheets:', error);
        res.status(500).json({ error: '데이터 로딩 실패' });
    }
});

app.post('/api/timesheets', async (req, res) => {
    try {
        const { rows, weekStart, employee, department } = req.body;
        if (!weekStart) return res.status(400).json({ error: '날짜 정보가 없습니다.' });

        // Determine Year from weekStart (expected YYYY-MM-DD)
        const year = weekStart.split('-')[0];
        const dbFile = getDbFile(year);

        if (!fs.existsSync(dbFile)) {
            fs.writeFileSync(dbFile, '[]');
        }

        let existingRecords = readJsonResilient(dbFile);

        // Filter out old records for THIS USER and THIS WEEK in THIS YEAR'S FILE
        const filteredRecords = existingRecords.filter(record =>
            !(record.employee === employee && record.week_start === weekStart)
        );

        const newRecords = rows.map(row => ({
            employee: employee,
            department: department,
            project_name: row.project,
            project_code: row.code,
            mon: row.hours.mon,
            tue: row.hours.tue,
            wed: row.hours.wed,
            thu: row.hours.thu,
            fri: row.hours.fri,
            sat: row.hours.sat,
            sun: row.hours.sun,
            total: Object.values(row.hours).reduce((a, b) => a + (parseFloat(b) || 0), 0),
            week_start: weekStart
        }));

        const finalRecords = [...filteredRecords, ...newRecords];
        await writeAtomic(dbFile, JSON.stringify(finalRecords, null, 2));

        res.json({ success: true, message: '저장되었습니다.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '저장 실패' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/timesheets/leave
// 현황판에서 휴가/반차 등록 시 타임시트에도 자동 반영하는 전용 엔드포인트
// Body: { employee, department, date (YYYY-MM-DD), hours, project_name }
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/timesheets/leave', async (req, res) => {
    try {
        const { employee, department, date, hours, project_name } = req.body;
        if (!employee || !date || !hours || !project_name) {
            return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
        }

        // 해당 날짜의 월요일(week_start) 계산
        const d = new Date(date);
        const dayOfWeek = d.getDay(); // 0=일, 1=월 ... 6=토
        const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(d);
        monday.setDate(d.getDate() + diffToMon);
        const weekStart = monday.toISOString().slice(0, 10);

        // 요일 컬럼 매핑 (0=sun, 1=mon ... 6=sat)
        const dayColMap = { 0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat' };
        const dayCol = dayColMap[dayOfWeek];

        const year = weekStart.split('-')[0];
        const dbFile = getDbFile(year);
        if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, '[]');

        let records = readJsonResilient(dbFile);

        // 사용자 정보에서 department 보완
        let resolvedDept = department;
        if (!resolvedDept) {
            const users = readJsonResilient(USERS_FILE);
            const found = users.find(u => u.name === employee);
            if (found) resolvedDept = found.department || '';
        }

        // 동일 직원/주차/project_name 행이 있으면 해당 요일 컬럼만 업데이트, 없으면 신규 추가
        const existingIdx = records.findIndex(
            r => r.employee === employee && r.week_start === weekStart && r.project_name === project_name
        );

        const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

        if (existingIdx !== -1) {
            records[existingIdx][dayCol] = String(parseFloat(records[existingIdx][dayCol] || 0) + parseFloat(hours));
            records[existingIdx].total = String(
                DAYS.reduce((sum, k) => sum + parseFloat(records[existingIdx][k] || 0), 0)
            );
        } else {
            const newRow = {
                employee,
                department: resolvedDept,
                project_name,
                project_code: 'LEAVE',
                mon: '0', tue: '0', wed: '0', thu: '0', fri: '0', sat: '0', sun: '0',
                total: String(hours),
                week_start: weekStart
            };
            newRow[dayCol] = String(hours);
            records.push(newRow);
        }

        await writeAtomic(dbFile, JSON.stringify(records, null, 2));
        res.json({ success: true, message: '타임시트에 휴가가 등록되었습니다.' });
    } catch (error) {
        console.error('[timesheets/leave] Error:', error);
        res.status(500).json({ error: '타임시트 저장 실패' });
    }
});

// =============================================
// --- ANALYTICS API ---
// =============================================

app.get('/api/analytics/manpower', (req, res) => {
    try {
        const { from, to } = req.query;
        if (!from || !to) {
            return res.status(400).json({ error: 'from and to dates are required' });
        }

        const startYear = parseInt(from.substring(0, 4), 10);
        const endYear = parseInt(to.substring(0, 4), 10);
        
        let allRecords = [];
        for (let y = startYear; y <= endYear; y++) {
            const dbFile = getDbFile(String(y));
            if (fs.existsSync(dbFile)) {
                allRecords = allRecords.concat(readJsonResilient(dbFile));
            }
        }

        const TEAM_ORDER = ['스마트 기술 개발팀', '디지털 기술 연구팀', '인프라 BIM팀', 'AI 응용팀'];
        const EXCLUDED_EMPLOYEES = ['김영근', '최형태'];

        const getNormalizedTeam = (raw) => {
            if (!raw) return null;
            const t = raw.replace(/\s+/g, ''); // Remove all spaces for matching
            if (t.includes('스마트')) return '스마트 기술 개발팀';
            if (t.includes('디지털')) return '디지털 기술 연구팀';
            if (t.includes('인프라')) return '인프라 BIM팀';
            if (t.includes('AI') || t.includes('응용')) return 'AI 응용팀';
            return null;
        };

        const CATEGORIES = ['AI', 'BIM', 'Smart R&D', 'Digital Technology', '기타 (Etc)'];
        const DAYS_KEY = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

        // Preliminary filter: any record whose week might overlap with [from, to]
        // Week start is Monday. Week end is Sunday (Monday + 6 days).
        const inRangeRecords = allRecords.filter(r => {
            if (r.project_name === '연차' || r.project_name === '반차') return false;
            if (EXCLUDED_EMPLOYEES.includes(r.employee)) return false;
            const normalizedTeam = getNormalizedTeam(r.department);
            if (!normalizedTeam) return false;

            const weekStart = r.week_start;
            const weekEndDate = new Date(weekStart);
            weekEndDate.setDate(weekEndDate.getDate() + 6);
            const weekEnd = weekEndDate.toISOString().split('T')[0];

            return weekStart <= to && weekEnd >= from;
        });

        const getCategory = (projectName) => {
            const name = projectName ? projectName.trim() : '';
            const upper = name.toUpperCase();
            if (upper.includes('AI')) return 'AI';
            if (upper.includes('BIM')) return 'BIM';
            if (name.includes('스마트') || upper.includes('SMART R&D')) return 'Smart R&D';
            if (name.includes('디지털') || upper.includes('DIGITAL')) return 'Digital Technology';
            return '기타 (Etc)';
        };

        let totalHours = 0;
        const byCategory = { 'AI': 0, 'BIM': 0, 'Smart R&D': 0, 'Digital Technology': 0, '기타 (Etc)': 0 };
        const byMonthMap = {};
        const byTeamMap = {};
        const byPersonMap = {};

        TEAM_ORDER.forEach(t => {
            byTeamMap[t] = { team: t, total: 0, 'AI': 0, 'BIM': 0, 'Smart R&D': 0, 'Digital Technology': 0, '기타 (Etc)': 0 };
        });

        inRangeRecords.forEach(r => {
            const team = getNormalizedTeam(r.department);
            const person = r.employee || '알 수 없음';
            const category = getCategory(r.project_name);
            
            // Timezone-safe parsing
            const [y, m, d] = r.week_start.split('-').map(Number);
            const weekStartBase = new Date(y, m - 1, d);

            DAYS_KEY.forEach((dayKey, index) => {
                const hours = parseFloat(r[dayKey]) || 0;
                if (hours <= 0) return;

                const dayDate = new Date(weekStartBase);
                dayDate.setDate(dayDate.getDate() + index);
                
                // Timezone-safe formatting (YYYY-MM-DD)
                const dy = dayDate.getFullYear();
                const dm = String(dayDate.getMonth() + 1).padStart(2, '0');
                const dd = String(dayDate.getDate()).padStart(2, '0');
                const dayDateStr = `${dy}-${dm}-${dd}`;

                // Check if this specific day is in range
                if (dayDateStr >= from && dayDateStr <= to) {
                    const monthLabel = (dayDate.getMonth() + 1) + '월';

                    if (person.includes('김경훈')) {
                        console.log(`[Analytics Debug] Adding ${hours}h for ${person} on ${dayDateStr} (${dayKey})`);
                    }

                    totalHours += hours;
                    byCategory[category] += hours;

                    // Month
                    if (!byMonthMap[monthLabel]) {
                        byMonthMap[monthLabel] = { label: monthLabel, 'AI': 0, 'BIM': 0, 'Smart R&D': 0, 'Digital Technology': 0, '기타 (Etc)': 0 };
                    }
                    byMonthMap[monthLabel][category] += hours;

                    // Team
                    byTeamMap[team][category] += hours;
                    byTeamMap[team].total += hours;

                    // Person
                    if (!byPersonMap[person]) {
                        byPersonMap[person] = { name: person, team: team, total: 0, 'AI': 0, 'BIM': 0, 'Smart R&D': 0, 'Digital Technology': 0, '기타 (Etc)': 0 };
                    }
                    byPersonMap[person][category] += hours;
                    byPersonMap[person].total += hours;
                } else {
                    if (person.includes('김경훈') && hours > 0) {
                        console.log(`[Analytics Debug] Skipping ${hours}h for ${person} on ${dayDateStr} (${dayKey}) - Out of range [${from}, ${to}]`);
                    }
                }
            });
        });

        const byMonth = Object.values(byMonthMap).sort((a, b) => parseInt(a.label) - parseInt(b.label));
        const byTeam = TEAM_ORDER.map(name => byTeamMap[name]).filter(t => t !== undefined);
        const byPerson = Object.values(byPersonMap).sort((a, b) => {
            const idxA = TEAM_ORDER.indexOf(a.team);
            const idxB = TEAM_ORDER.indexOf(b.team);
            if (idxA !== idxB) return idxA - idxB;
            return b.total - a.total;
        });

        // Calculate Percentages
        [...byTeam, ...byPerson].forEach(item => {
            if (item.total > 0) {
                CATEGORIES.forEach(cat => {
                    item[`${cat}_pct`] = (item[cat] / item.total) * 100;
                });
            }
        });

        res.json({
            period: { from, to },
            totalHours,
            byCategory,
            byMonth,
            byTeam,
            byPerson
        });

    } catch (error) {
        console.error('API Error in /api/analytics/manpower:', error);
        res.status(500).json({ error: '데이터 분석 실패' });
    }
});

// =============================================
// --- WEEKLY MEETING API ---
// =============================================

// Helper: getWeekStart (ISO monday)
function getWeekStartStr(dateStr) {
    if (!dateStr) {
        const d = new Date();
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setHours(0,0,0,0);
        d.setDate(d.getDate() + diff);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() + diff);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// Helper: Check if a task date range overlaps with a requested week
function isTaskInWeek(taskStart, taskEnd, requestedWeekMonday, strict = false) {
    if (!requestedWeekMonday) return false;
    
    const reqStart = new Date(requestedWeekMonday);
    // 일반 팀별 업무는 구글 시트 양식과 동일하게 지난주 데이터까지 함께 표시되도록 시작 기준일을 -7일 확장하지만,
    // 주간일정 등 엄격한 필터링이 필요한 경우 확장하지 않습니다.
    if (!strict) {
        reqStart.setDate(reqStart.getDate() - 7);
    }
    reqStart.setHours(0,0,0,0);
    
    const reqEnd = new Date(requestedWeekMonday);
    reqEnd.setDate(reqEnd.getDate() + 6);
    reqEnd.setHours(23,59,59,999);

    if (!taskStart) return false;
    const tStart = new Date(taskStart);
    tStart.setHours(0,0,0,0);
    
    // If no end date, it's a one-day/one-week task starting on taskStart
    const tEnd = taskEnd ? new Date(taskEnd) : new Date(tStart);
    tEnd.setHours(23,59,59,999);

    // Overlap condition: (StartA <= EndB) and (EndA >= StartB)
    return tStart <= reqEnd && tEnd >= reqStart;
}

// ── 회의 개요 (참석자/일시) API ──
app.get('/api/meeting-overview', (req, res) => {
    try {
        const { week } = req.query;
        if (!week) return res.status(400).json({ error: 'Week is required' });
        const allData = readJsonResilient(MEETING_OVERVIEW_FILE);
        const item = allData.find(d => d.week === week) || { week, absentees: [], meeting_date: '' };
        res.json(item);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/meeting-overview', async (req, res) => {
    try {
        const { week, absentees, meeting_date } = req.body;
        if (!week) return res.status(400).json({ error: 'Week is required' });
        
        let allData = readJsonResilient(MEETING_OVERVIEW_FILE);
        const idx = allData.findIndex(d => d.week === week);
        
        const newItem = { week, absentees: absentees || [], meeting_date: meeting_date || '' };
        if (idx > -1) allData[idx] = newItem;
        else allData.push(newItem);
        
        await writeAtomic(MEETING_OVERVIEW_FILE, JSON.stringify(allData, null, 2));
        res.json({ success: true, data: newItem });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/weekly-tasks — 주차·팀 필터 조회
app.get('/api/weekly-tasks', (req, res) => {
    try {
        const { week, team, year } = req.query;
        const y = year || (week ? week.slice(0, 4) : String(new Date().getFullYear()));
        const file = getWeeklyTasksFile(y);
        let tasks = readJsonResilient(file);

        // role 없는 데이터 기본값 처리
        tasks = tasks.map(t => ({ ...t, role: t.role || 'member' }));

        if (week) {
            // 지난주 월요일 날짜 문자열 계산 (fallback용)
            const d = new Date(week);
            d.setDate(d.getDate() - 7);
            const lastWeekStr = d.toISOString().slice(0, 10);

            const isStrict = req.query.strict === 'true';
            tasks = tasks.filter(t => {
                // Primary check: Range overlap (if dates exist)
                if (t.start_date) {
                    return isTaskInWeek(t.start_date, t.end_date, week, isStrict);
                }
                // Fallback: Exact week match for legacy data without start_date
                // Strict 모드인 경우 이번 주 데이터만, 아닌 경우 지난주 데이터까지 허용
                if (isStrict) {
                    return t.week_start === week;
                }
                return t.week_start === week || t.week_start === lastWeekStr;
            });
        }
        if (team) tasks = tasks.filter(t => t.team === team);

        res.json(tasks);
    } catch (e) {
        console.error('[API] GET /api/weekly-tasks:', e);
        res.status(500).json({ error: '업무 목록 조회 실패' });
    }
});

// GET /api/weekly-tasks/weeks — 등록된 주차 목록
app.get('/api/weekly-tasks/weeks', (req, res) => {
    const sorted = [...weeksCache].sort().reverse();
    res.json(sorted);
});

// POST /api/weekly-tasks — 업무 등록
app.post('/api/weekly-tasks', async (req, res) => {
    try {
        const { team, category, sub_category, task_code, content, assignees,
                status, priority, start_date, end_date, meeting_result, note } = req.body;
        if (!content) return res.status(400).json({ error: '주요내용은 필수입니다.' });

        const year = start_date ? start_date.slice(0, 4) : String(new Date().getFullYear());
        const file = getWeeklyTasksFile(year);
        if (!fs.existsSync(file)) fs.writeFileSync(file, '[]');

        const records = readJsonResilient(file);
        const id = Date.now().toString();
        const weekStart = getWeekStartStr(start_date);
        const now = new Date().toISOString().slice(0, 10);

        const newTask = {
            id, team: team || '', category: category || '', sub_category: sub_category || '',
            task_code: task_code || '', content, assignees: assignees || '',
            status: status || '진행 중', priority: priority || '중간',
            start_date: start_date || '', end_date: end_date || '',
            meeting_result: meeting_result || '', note: note || '',
            week_start: weekStart, created_at: now
        };

        const updated = [...records, newTask];
        await writeAtomic(file, JSON.stringify(updated, null, 2));
        
        if (newTask.week_start && !weeksCache.has(newTask.week_start)) {
            weeksCache.add(newTask.week_start);
        }

        res.json({ success: true, task: newTask });
    } catch (e) {
        console.error('[API] POST /api/weekly-tasks:', e);
        res.status(500).json({ error: '업무 등록 실패' });
    }
});

// PUT /api/weekly-tasks/:id — 업무 수정
app.put('/api/weekly-tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        let file = '';
        let records = [];
        let idx = -1;

        // 조회할 연도 목록 (기본적으로 올해, 작년, 재작년 검색)
        const currentYear = String(new Date().getFullYear());
        const yearsToCheck = [currentYear, '2025', '2024'];

        // 만약 업데이트 데이터에 start_date가 있다면 해당 연도를 우선 검색
        if (updates.start_date) {
            const prioritizedYear = updates.start_date.slice(0, 4);
            const pIdx = yearsToCheck.indexOf(prioritizedYear);
            if (pIdx !== -1) {
                yearsToCheck.splice(pIdx, 1);
            }
            yearsToCheck.unshift(prioritizedYear);
        }

        for (const y of yearsToCheck) {
            const f = getWeeklyTasksFile(y);
            const r = readJsonResilient(f);
            const i = r.findIndex(item => item.id === id);
            
            console.log(`[API] Checking file ${f} for id ${id}: found=${i !== -1}`);
            
            if (i !== -1) {
                file = f;
                records = r;
                idx = i;
                break;
            }
        }

        if (idx === -1) {
            console.log(`[API] Task not found in any file. Returning 404.`);
            return res.status(404).json({ error: '업무를 찾을 수 없습니다.' });
        }

        records[idx] = { ...records[idx], ...updates };
        if (updates.start_date) records[idx].week_start = getWeekStartStr(updates.start_date);

        await writeAtomic(file, JSON.stringify(records, null, 2));
        console.log(`[API] Task updated successfully in ${file}.`);
        res.json({ success: true, task: records[idx] });
    } catch (e) {
        console.error('[API] PUT /api/weekly-tasks/:id:', e);
        res.status(500).json({ error: '업무 수정 실패' });
    }
});

// DELETE /api/weekly-tasks/:id — 업무 삭제
app.delete('/api/weekly-tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const currentYear = String(new Date().getFullYear());
        const yearsToCheck = [currentYear, '2025', '2024'];
        
        if (req.query.year) {
            const pIdx = yearsToCheck.indexOf(req.query.year);
            if (pIdx !== -1) {
                yearsToCheck.splice(pIdx, 1);
            }
            yearsToCheck.unshift(req.query.year);
        }

        let file = '';
        let records = [];
        let idx = -1;

        for (const y of yearsToCheck) {
            const f = getWeeklyTasksFile(y);
            const r = readJsonResilient(f);
            const i = r.findIndex(item => String(item.id).trim() === String(id).trim());
            
            if (i !== -1) {
                file = f;
                records = r;
                idx = i;
                break;
            }
        }

        if (idx === -1) {
            console.log(`[API] Task Delete Failed: ID ${id} not found in any file.`);
            return res.status(404).json({ error: '업무를 찾을 수 없습니다.' });
        }
        
        const filtered = records.filter(r => String(r.id).trim() !== String(id).trim());
        await writeAtomic(file, JSON.stringify(filtered, null, 2));
        console.log(`[API] Task Delete Success: ${id} from ${file}`);
        res.json({ success: true });
    } catch (e) {
        console.error('[API] DELETE /api/weekly-tasks Error:', e);
        res.status(500).json({ error: '업무 삭제 실패' });
    }
});

// Helper for Two-Way Sync: Weekly Schedule -> Timesheet
const syncLeaveToTimesheet = async (oldRecord, newRecord) => {
    try {
        const processRecord = async (record, action) => {
            if (record.schedule_type !== '휴가' || !record.assignees) return;
            const start = new Date(record.start_date);
            const end = record.end_date ? new Date(record.end_date) : new Date(start);
            
            let leaveType = '연차';
            let hours = 8;
            const content = record.content || '';
            if (content.includes('오전반차') || content === '오전' || content.includes('오전')) { leaveType = '오전반차'; hours = 4; }
            else if (content.includes('오후반차') || content === '오후' || content.includes('오후')) { leaveType = '오후반차'; hours = 4; }
            else if (content.includes('반차')) { leaveType = '반차'; hours = 4; }
            else if (content.includes('연차') || content.includes('휴가')) { leaveType = '연차'; hours = 8; }

            const assigneeArray = record.assignees.split(',').map(s => s.trim()).filter(Boolean);

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const yearStr = String(d.getFullYear());
                const dbFile = getDbFile(yearStr);
                const timesheets = readJsonResilient(dbFile);
                let updated = false;

                const dayOfDate = d.getDay();
                const diffToMon = dayOfDate === 0 ? -6 : 1 - dayOfDate;
                const weekStartObj = new Date(d);
                weekStartObj.setDate(d.getDate() + diffToMon);
                const weekStartStr = weekStartObj.toISOString().slice(0, 10);
                
                const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                const dayCol = dayNames[d.getDay()];

                assigneeArray.forEach(empName => {
                    // Always clear existing leave for this day first
                    timesheets.forEach(ts => {
                        if (ts.employee === empName && ts.week_start === weekStartStr && ['연차', '반차', '오전반차', '오후반차'].includes(ts.project_name)) {
                            if (ts[dayCol] > 0) {
                                ts[dayCol] = 0;
                                updated = true;
                            }
                        }
                    });

                    if (action === 'add') {
                        let targetRow = timesheets.find(ts => ts.employee === empName && ts.week_start === weekStartStr && ts.project_name === leaveType);
                        if (targetRow) {
                            targetRow[dayCol] = hours;
                            updated = true;
                        } else {
                            const newRow = {
                                employee: empName,
                                department: "",
                                week_start: weekStartStr,
                                project_name: leaveType,
                                code: 'LEAVE',
                                mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0,
                                created_at: new Date().toISOString()
                            };
                            newRow[dayCol] = hours;
                            timesheets.push(newRow);
                            updated = true;
                        }
                    }
                });

                if (updated) {
                    await writeAtomic(dbFile, JSON.stringify(timesheets, null, 2));
                    console.log(`[API] Synced Leave to Timesheet (${dbFile}) successfully.`);
                }
            }
        };

        if (oldRecord) await processRecord(oldRecord, 'remove');
        if (newRecord) await processRecord(newRecord, 'add');
    } catch (err) {
        console.error('[API] Failed to sync leave to timesheet:', err);
    }
};

// GET /api/weekly-schedule — 주간 일정 조회
app.get('/api/weekly-schedule', (req, res) => {
    try {
        const { week, year } = req.query;
        let records = readJsonResilient(SCHEDULE_FILE);
        if (year) records = records.filter(r => r.year === year);
        if (week) {
            records = records.filter(r => {
                if (r.start_date) {
                    return isTaskInWeek(r.start_date, r.end_date, week, req.query.strict === 'true');
                }
                return r.week_start === week;
            });
        }
        res.json(records);
    } catch (e) {
        res.status(500).json({ error: '일정 조회 실패' });
    }
});

// POST /api/weekly-schedule — 일정 등록
app.post('/api/weekly-schedule', async (req, res) => {
    try {
        const { schedule_type, content, start_date, end_date, location, assignees, display_assignees, display_manager } = req.body;
        if (!content) return res.status(400).json({ error: '내용은 필수입니다.' });
        const records = readJsonResilient(SCHEDULE_FILE);
        const id = Date.now().toString();
        const weekStart = getWeekStartStr(start_date);
        const year = start_date ? start_date.slice(0, 4) : String(new Date().getFullYear());
        const now = new Date().toISOString().slice(0, 10);
        const newRecord = { id, schedule_type: schedule_type || '', content, start_date: start_date || '',
            end_date: end_date || '', location: location || '', assignees: assignees || '',
            display_assignees: display_assignees || '', display_manager: display_manager || '',
            week_start: weekStart, year, created_at: now, team: req.body.team || '', manager: req.body.manager || '' };
        const updated = [...records, newRecord];
        await writeAtomic(SCHEDULE_FILE, JSON.stringify(updated, null, 2));
        
        if (newRecord.week_start && !weeksCache.has(newRecord.week_start)) {
            weeksCache.add(newRecord.week_start);
        }

        // --- 2-Way Sync ---
        await syncLeaveToTimesheet(null, newRecord);

        res.json({ success: true, record: newRecord });
    } catch (e) {
        res.status(500).json({ error: '일정 등록 실패' });
    }
});

// POST /api/weekly-schedule/sync-timesheet-leaves — 타임시트 연차/반차 -> 주간일정 양방향 동기화
app.post('/api/weekly-schedule/sync-timesheet-leaves', async (req, res) => {
    try {
        const { employee, weekStart, leaves } = req.body;
        let records = readJsonResilient(SCHEDULE_FILE);
        
        const start = new Date(weekStart);
        const weekDates = [];
        for(let i=0; i<7; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            weekDates.push(d.toISOString().slice(0, 10));
        }

        const isEmployeeLeaveInWeek = (r) => {
            if (r.schedule_type !== '휴가') return false;
            if (!r.assignees || !r.assignees.includes(employee)) return false;
            const rStart = new Date(r.start_date);
            const rEnd = r.end_date ? new Date(r.end_date) : rStart;
            const wStart = new Date(weekStart);
            const wEnd = new Date(weekDates[6]);
            return (rStart <= wEnd && rEnd >= wStart);
        };

        const intersectingLeaves = records.filter(isEmployeeLeaveInWeek);
        records = records.filter(r => !isEmployeeLeaveInWeek(r));

        const leftoverLeaves = [];
        intersectingLeaves.forEach(r => {
            const rStart = new Date(r.start_date);
            const rEnd = r.end_date ? new Date(r.end_date) : rStart;
            for(let d = new Date(rStart); d <= rEnd; d.setDate(d.getDate() + 1)) {
                const dStr = d.toISOString().slice(0, 10);
                if (!weekDates.includes(dStr)) {
                    leftoverLeaves.push({
                        ...r,
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                        start_date: dStr,
                        end_date: dStr,
                        week_start: getWeekStartStr(dStr),
                        year: dStr.slice(0, 4)
                    });
                }
            }
        });
        
        records = [...records, ...leftoverLeaves];

        const newLeaves = leaves.map(l => {
            return {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                schedule_type: '휴가',
                content: l.type,
                start_date: l.date,
                end_date: l.date,
                location: '',
                assignees: employee,
                week_start: weekStart,
                year: l.date.slice(0, 4),
                created_at: new Date().toISOString().slice(0, 10)
            };
        });

        records = [...records, ...newLeaves];

        await writeAtomic(SCHEDULE_FILE, JSON.stringify(records, null, 2));
        
        newLeaves.forEach(l => weeksCache.add(l.week_start));
        leftoverLeaves.forEach(l => weeksCache.add(l.week_start));

        res.json({ success: true });
    } catch (e) {
        console.error('[API] /api/weekly-schedule/sync-timesheet-leaves Error:', e);
        res.status(500).json({ error: '일정 동기화 실패' });
    }
});

// PUT /api/weekly-schedule/:id — 일정 수정
app.put('/api/weekly-schedule/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const records = readJsonResilient(SCHEDULE_FILE);
        const idx = records.findIndex(r => r.id === id);
        if (idx === -1) return res.status(404).json({ error: '일정을 찾을 수 없습니다.' });

        const oldRecord = { ...records[idx] };
        records[idx] = { ...records[idx], ...updates };
        if (updates.start_date) {
            records[idx].week_start = getWeekStartStr(updates.start_date);
            records[idx].year = updates.start_date.slice(0, 4);
        }

        await writeAtomic(SCHEDULE_FILE, JSON.stringify(records, null, 2));

        // --- 2-Way Sync ---
        await syncLeaveToTimesheet(oldRecord, records[idx]);

        res.json({ success: true, record: records[idx] });
    } catch (e) {
        console.error('[API] PUT /api/weekly-schedule/:id:', e);
        res.status(500).json({ error: '일정 수정 실패' });
    }
});


// DELETE /api/weekly-schedule/:id
app.delete('/api/weekly-schedule/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const records = readJsonResilient(SCHEDULE_FILE);
        const recordToDelete = records.find(r => r.id && String(r.id).trim() === String(id).trim());
        if (!recordToDelete) {
            console.log(`[API] Schedule Delete Failed: ID ${id} not found.`);
            return res.status(404).json({ error: '일정을 찾을 수 없습니다.' });
        }

        const filtered = records.filter(r => r.id && String(r.id).trim() !== String(id).trim());
        await writeAtomic(SCHEDULE_FILE, JSON.stringify(filtered, null, 2));
        
        // --- 2-Way Sync ---
        await syncLeaveToTimesheet(recordToDelete, null);

        console.log(`[API] Schedule Delete Success: ${id}`);
        res.json({ success: true });
    } catch (e) {
        console.error('[API] DELETE /api/weekly-schedule Error:', e);
        res.status(500).json({ error: '일정 삭제 실패' });
    }
});

// GET /api/projects
app.get('/api/projects', (req, res) => {
    try {
        const projects = readJsonResilient(PROJECTS_FILE);
        res.json(projects);
    } catch (e) {
        res.status(500).json({ error: '프로젝트 조회 실패' });
    }
});

// =============================================
// --- CIRCULATION BOARD API ---
// =============================================
const CIRCULATION_FILE = path.join(__dirname, 'circulation_data.json');

app.get('/api/circulation', (req, res) => {
    try {
        if (!fs.existsSync(CIRCULATION_FILE)) {
            return res.json({});
        }
        const data = JSON.parse(fs.readFileSync(CIRCULATION_FILE, 'utf8'));
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: '회람 데이터 조회 실패' });
    }
});

app.post('/api/circulation', async (req, res) => {
    try {
        const payload = req.body;
        let existing = {};
        if (fs.existsSync(CIRCULATION_FILE)) {
            try {
                existing = JSON.parse(fs.readFileSync(CIRCULATION_FILE, 'utf8'));
            } catch(e) {
                console.error('[API] Failed to parse circulation file, resetting.');
            }
        }
        const updated = { ...existing, ...payload };
        await writeAtomic(CIRCULATION_FILE, JSON.stringify(updated, null, 2));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: '회람 데이터 저장 실패' });
    }
});

// POST /api/projects
app.post('/api/projects', async (req, res) => {
    try {
        const { category, sub_no, project_code, project_name, method, bim_cost, dept, manager, status_detail } = req.body;
        if (!project_name) return res.status(400).json({ error: '프로젝트명은 필수입니다.' });
        const records = readJsonResilient(PROJECTS_FILE);
        const id = Date.now().toString();
        const now = new Date().toISOString().slice(0, 10);
        const newProject = { id, category: category || '', sub_no: sub_no || '', project_code: project_code || '',
            project_name, method: method || '', bim_cost: bim_cost || '', dept: dept || '',
            manager: manager || '', status_detail: status_detail || '', created_at: now };
        const updated = [...records, newProject];
        await writeAtomic(PROJECTS_FILE, JSON.stringify(updated, null, 2));
        res.json({ success: true, project: newProject });
    } catch (e) {
        res.status(500).json({ error: '프로젝트 등록 실패' });
    }
});

// PUT /api/projects/:id
app.put('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const records = readJsonResilient(PROJECTS_FILE);
        const idx = records.findIndex(r => r.id === id);
        if (idx === -1) return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
        records[idx] = { ...records[idx], ...updates };
        await writeAtomic(PROJECTS_FILE, JSON.stringify(records, null, 2));
        res.json({ success: true, project: records[idx] });
    } catch (e) {
        res.status(500).json({ error: '프로젝트 수정 실패' });
    }
});

// DELETE /api/projects/:id
app.delete('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[API] DELETE /api/projects/${id}`);
        const records = readJsonResilient(PROJECTS_FILE);
        
        const filtered = records.filter(r => r.id && String(r.id).trim() !== String(id).trim());
        
        if (filtered.length === records.length) {
            console.log(`[API] Delete Failed: ID ${id} not found among: ${records.map(r=>r.id).slice(0,5).join(', ')}...`);
            return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
        }
        
        await writeAtomic(PROJECTS_FILE, JSON.stringify(filtered, null, 2));
        console.log(`[API] Delete Success: ${id}`);
        res.json({ success: true });
    } catch (e) {
        console.error(`[API] DELETE /api/projects/${id} Error:`, e);
        res.status(500).json({ error: '프로젝트 삭제 실패' });
    }
});

// =============================================
// --- RAG CHAT API (AI Orchestrator) ---
// =============================================
app.post('/api/rag-chat', async (req, res) => {
    try {
        const { messages, query } = req.body;
        if (!query) {
            return res.status(400).json({ error: '질문(query)이 필요합니다.' });
        }

        // AI Orchestrator를 통해 질문 처리 (Dispatcher → Agent 선택 → 응답)
        // 실패 시 기존 ragService로 fallback
        let response;
        try {
            response = await handleQuestion(messages || [], query);
        } catch (orchErr) {
            console.warn('[API] Orchestrator 실패, ragService fallback:', orchErr.message);
            response = await chatWithRag(messages || [], query);
        }
        res.json(response);
    } catch (e) {
        console.error('[API] /api/rag-chat Error:', e);
        res.status(500).json({ error: 'RAG 기반 챗봇 대답 중 오류가 발생했습니다.' });
    }
});


// --- GITHUB WEBHOOK AUTO-DEPLOY (DISABLED FOR MANUAL CONTROL) ---
const DEPLOY_SECRET = 'kunhwa-wms-deploy-2026';
let isDeploying = false;

app.post('/api/webhook/deploy_DISABLED', (req, res) => {
    // Verify GitHub signature
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
        console.log('[Webhook] Rejected: No signature');
        return res.status(403).json({ error: 'Missing signature' });
    }

    const hmac = crypto.createHmac('sha256', DEPLOY_SECRET);
    const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
        console.log('[Webhook] Rejected: Invalid signature');
        return res.status(403).json({ error: 'Invalid signature' });
    }

    // Check event type
    const event = req.headers['x-github-event'];
    if (event !== 'push') {
        return res.json({ message: `Ignored event: ${event}` });
    }

    // Prevent concurrent deploys
    if (isDeploying) {
        console.log('[Webhook] Deploy already in progress, skipping');
        return res.json({ message: 'Deploy already in progress' });
    }

    isDeploying = true;
    console.log('[Webhook] Deploy triggered! Starting auto_deploy.bat...');

    const deployScript = path.join(__dirname, 'scripts', 'auto_deploy.bat');
    const child = execFile('cmd.exe', ['/c', deployScript], {
        cwd: __dirname,
        detached: true,
        stdio: 'ignore',
        windowsHide: false
    });

    child.unref();

    // Reset lock after 5 minutes (safety timeout)
    setTimeout(() => { isDeploying = false; }, 5 * 60 * 1000);

    res.json({ success: true, message: 'Deploy started' });
});

// --- STATIC & START ---
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get(/(.*)/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
