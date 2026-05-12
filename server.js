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

        // Backup users
        if (fs.existsSync(USERS_FILE)) {
            fs.copyFileSync(USERS_FILE, path.join(BACKUP_DIR, `${timestamp}_users.json`));
        }

        // Backup all database_*.json files
        const files = fs.readdirSync(__dirname);
        files.forEach(file => {
            if (file.startsWith('database_') && file.endsWith('.json')) {
                fs.copyFileSync(path.join(__dirname, file), path.join(BACKUP_DIR, `${timestamp}_${file}`));
            }
        });

        // Update last backup marker
        fs.writeFileSync(path.join(BACKUP_DIR, '.last_backup'), new Date().toISOString().slice(0, 7)); // YYYY-MM
        return true;
    } catch (error) {
        console.error('[Backup] Failed:', error);
        return false;
    }
};

// Startup Check: Monthly Backup
const checkStartupBackup = () => {
    const markerFile = path.join(BACKUP_DIR, '.last_backup');
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    let lastMonth = '';

    if (fs.existsSync(markerFile)) {
        lastMonth = fs.readFileSync(markerFile, 'utf8').trim();
    }

    if (currentMonth !== lastMonth) {
        console.log(`[Startup] New month detected (${currentMonth}). Running monthly backup...`);
        performBackup();
    } else {
        console.log(`[Startup] Monthly backup already performed for ${currentMonth}.`);
    }
};

checkStartupBackup();

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
function isTaskInWeek(taskStart, taskEnd, requestedWeekMonday) {
    if (!requestedWeekMonday) return false;
    
    const reqStart = new Date(requestedWeekMonday);
    reqStart.setHours(0,0,0,0);
    const reqEnd = new Date(reqStart);
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
            tasks = tasks.filter(t => {
                // Primary check: Range overlap (if dates exist)
                if (t.start_date) {
                    return isTaskInWeek(t.start_date, t.end_date, week);
                }
                // Fallback: Exact week match for legacy data without start_date
                return t.week_start === week;
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
        const year = updates.start_date ? updates.start_date.slice(0, 4) : String(new Date().getFullYear());
        const file = getWeeklyTasksFile(year);
        const records = readJsonResilient(file);
        const idx = records.findIndex(r => r.id === id);
        if (idx === -1) return res.status(404).json({ error: '업무를 찾을 수 없습니다.' });

        records[idx] = { ...records[idx], ...updates };
        if (updates.start_date) records[idx].week_start = getWeekStartStr(updates.start_date);

        await writeAtomic(file, JSON.stringify(records, null, 2));
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
        const year = req.query.year || String(new Date().getFullYear());
        const file = getWeeklyTasksFile(year);
        const records = readJsonResilient(file);
        
        const filtered = records.filter(r => r.id && String(r.id).trim() !== String(id).trim());
        
        if (filtered.length === records.length) {
            console.log(`[API] Task Delete Failed: ID ${id} not found.`);
            return res.status(404).json({ error: '업무를 찾을 수 없습니다.' });
        }
        
        await writeAtomic(file, JSON.stringify(filtered, null, 2));
        console.log(`[API] Task Delete Success: ${id}`);
        res.json({ success: true });
    } catch (e) {
        console.error('[API] DELETE /api/weekly-tasks Error:', e);
        res.status(500).json({ error: '업무 삭제 실패' });
    }
});

// GET /api/weekly-schedule — 주간 일정 조회
app.get('/api/weekly-schedule', (req, res) => {
    try {
        const { week, year } = req.query;
        let records = readJsonResilient(SCHEDULE_FILE);
        if (year) records = records.filter(r => r.year === year);
        if (week) {
            records = records.filter(r => {
                if (r.start_date) {
                    return isTaskInWeek(r.start_date, r.end_date, week);
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
        const { schedule_type, content, start_date, end_date, location, assignees } = req.body;
        if (!content) return res.status(400).json({ error: '내용은 필수입니다.' });
        const records = readJsonResilient(SCHEDULE_FILE);
        const id = Date.now().toString();
        const weekStart = getWeekStartStr(start_date);
        const year = start_date ? start_date.slice(0, 4) : String(new Date().getFullYear());
        const now = new Date().toISOString().slice(0, 10);
        const newRecord = { id, schedule_type: schedule_type || '', content, start_date: start_date || '',
            end_date: end_date || '', location: location || '', assignees: assignees || '',
            week_start: weekStart, year, created_at: now };
        const updated = [...records, newRecord];
        await writeAtomic(SCHEDULE_FILE, JSON.stringify(updated, null, 2));
        
        if (newRecord.week_start && !weeksCache.has(newRecord.week_start)) {
            weeksCache.add(newRecord.week_start);
        }

        res.json({ success: true, record: newRecord });
    } catch (e) {
        res.status(500).json({ error: '일정 등록 실패' });
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

        records[idx] = { ...records[idx], ...updates };
        if (updates.start_date) {
            records[idx].week_start = getWeekStartStr(updates.start_date);
            records[idx].year = updates.start_date.slice(0, 4);
        }

        await writeAtomic(SCHEDULE_FILE, JSON.stringify(records, null, 2));
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
        const filtered = records.filter(r => r.id && String(r.id).trim() !== String(id).trim());

        if (filtered.length === records.length) {
            console.log(`[API] Schedule Delete Failed: ID ${id} not found.`);
            return res.status(404).json({ error: '일정을 찾을 수 없습니다.' });
        }

        await writeAtomic(SCHEDULE_FILE, JSON.stringify(filtered, null, 2));
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


// --- GITHUB WEBHOOK AUTO-DEPLOY ---
const DEPLOY_SECRET = 'kunhwa-wms-deploy-2026';
let isDeploying = false;

app.post('/api/webhook/deploy', (req, res) => {
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
