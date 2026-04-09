import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import { stringify } from 'csv-stringify/sync';
import { parse } from 'csv-parse/sync';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto'; // Import crypto for webhook signature verification
import { execFile } from 'child_process'; // Import for deploy script execution
import { writeAtomic } from './src/utils/safeStorage.js';
import { initializeVectorStore, chatWithRag } from './ragService.js';
import { handleQuestion } from './server/ai/aiOrchestrator.js';
import { ingestCSV } from './server/dataPipeline/csvToVectorPipeline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// --- CONFIG & PATHS ---
const USERS_FILE = path.join(__dirname, 'users.csv');
const USER_COLUMNS = ['id', 'name', 'department', 'password'];
const BACKUP_DIR = path.join(__dirname, 'backups');

const getDbFile = (year) => {
    const y = year || new Date().getFullYear();
    return path.join(__dirname, `database_${y}.csv`);
};

const DB_COLUMNS = ['employee', 'department', 'project_name', 'project_code', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'total', 'week_start'];

// Weekly Meeting Files
const WEEKLY_TASKS_COLUMNS = [
    'id', 'team', 'category', 'sub_category', 'task_code',
    'content', 'assignees', 'status', 'priority',
    'start_date', 'end_date', 'meeting_result', 'note', 'week_start', 'created_at'
];
const PROJECTS_COLUMNS = [
    'id', 'category', 'sub_no', 'project_code', 'project_name',
    'method', 'bim_cost', 'dept', 'manager', 'status_detail', 'created_at'
];
const SCHEDULE_COLUMNS = [
    'id', 'schedule_type', 'content', 'start_date', 'end_date',
    'location', 'assignees', 'week_start', 'year', 'created_at'
];

const getWeeklyTasksFile = (year) => path.join(__dirname, `weekly_tasks_${year || new Date().getFullYear()}.csv`);
const PROJECTS_FILE = path.join(__dirname, 'projects.csv');
const SCHEDULE_FILE = path.join(__dirname, 'weekly_schedule.csv');

// --- INITIALIZATION ---
const currentYear = new Date().getFullYear();

// Ensure weekly files exist
const currentWeeklyFile = getWeeklyTasksFile(currentYear);
if (!fs.existsSync(currentWeeklyFile)) {
    fs.writeFileSync(currentWeeklyFile, WEEKLY_TASKS_COLUMNS.join(',') + '\n');
}
if (!fs.existsSync(PROJECTS_FILE)) {
    fs.writeFileSync(PROJECTS_FILE, PROJECTS_COLUMNS.join(',') + '\n');
}
if (!fs.existsSync(SCHEDULE_FILE)) {
    fs.writeFileSync(SCHEDULE_FILE, SCHEDULE_COLUMNS.join(',') + '\n');
}

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

// Initialize current year DB if not exists
const currentDb = getDbFile(currentYear); // e.g., database_2026.csv

if (!fs.existsSync(currentDb)) {
    // Check for legacy database.csv
    const legacyDb = path.join(__dirname, 'database.csv');
    if (fs.existsSync(legacyDb)) {
        // Rename legacy database.csv to database_sample.csv instead of migrating it to current year
        const sampleDb = path.join(__dirname, 'database_sample.csv');
        console.log(`[Init] Archiving legacy data to ${sampleDb} (Sample Data)`);
        try {
            if (fs.existsSync(sampleDb)) fs.unlinkSync(sampleDb); // Overwrite if exists
            fs.renameSync(legacyDb, sampleDb);
        } catch (e) {
            console.error('[Init] Failed to archive legacy DB:', e);
        }
    }

    // Create FRESH DB for the current year
    console.log(`[Init] Creating fresh database for ${currentYear}: ${currentDb}`);
    fs.writeFileSync(currentDb, stringify([DB_COLUMNS]));
}

// Initialize Users DB if not exists
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, stringify([USER_COLUMNS]));
}

// --- BACKUP LOGIC ---
const performBackup = () => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 10); // YYYY-MM-DD
        console.log(`[Backup] Starting backup ${timestamp}...`);

        // Backup users
        if (fs.existsSync(USERS_FILE)) {
            fs.copyFileSync(USERS_FILE, path.join(BACKUP_DIR, `${timestamp}_users.csv`));
        }

        // Backup all database_*.csv files
        const files = fs.readdirSync(__dirname);
        files.forEach(file => {
            if (file.startsWith('database_') && file.endsWith('.csv')) {
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
initializeVectorStore(currentDb); // Legacy in-memory VectorStore (fallback)

// --- GLOBAL EXCEPTION HANDLERS ---
process.on('uncaughtException', (err) => {
    console.error('\n[Global] Uncaught Exception preventing crash:', err.message || err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('\n[Global] Unhandled Promise Rejection preventing crash:', reason?.message || reason);
});

// --- QDRANT RAG INITIALIZATION ---
(async () => {
    try {
        console.log('[Qdrant] Starting Qdrant ingestion pipeline...');
        const result = await ingestCSV(currentDb, false);
        console.log(`[Qdrant] Ingestion complete: ${result.documentCount} docs, ${result.vectorCount} vectors`);
    } catch (e) {
        console.warn('[Qdrant] Ingestion failed (will use legacy fallback):', e.message || e);
    }
})().catch(err => {
    console.error('[Qdrant] Critical async failure caught at IIFE level:', err.message || err);
});

// --- MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json({
    verify: (req, _res, buf) => {
        // Store raw body for webhook signature verification
        req.rawBody = buf;
    }
}));

// --- HELPERS ---
const readCsvResilient = (filePath) => {
    if (!fs.existsSync(filePath)) return [];
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content.trim()) return []; // Empty file check

        return parse(content, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relax_column_count: true,
            bom: true
        });
    } catch (e) {
        console.error(`[CSV Error] Failed to read ${filePath}:`, e);
        return [];
    }
};

// --- USER API ---
app.post('/api/login', (req, res) => {
    try {
        const { name, password } = req.body;
        if (!name || !password) return res.status(400).json({ error: '정보가 누락되었습니다.' });

        const users = readCsvResilient(USERS_FILE);
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

app.post('/api/users', (req, res) => {
    try {
        let { name, department, password, role } = req.body;
        name = name.trim();
        department = department.trim();
        role = (role || 'member').trim();

        const users = readCsvResilient(USERS_FILE);
        if (users.some(u => u.name.trim().replace(/\s+/g, '') === name.replace(/\s+/g, ''))) {
            return res.status(409).json({ success: false, message: '이미 존재하는 이름입니다.' });
        }

        const id = Date.now().toString();
        const newUser = { id, name, department, password, role };
        const allColumns = [...USER_COLUMNS, 'role'];
        const userRow = stringify([newUser], { header: false, columns: allColumns });
        fs.appendFileSync(USERS_FILE, userRow);

        res.json({ success: true, user: { id, name, department, role } });
    } catch (error) {
        res.status(500).json({ error: '사용자 추가 실패' });
    }
});

app.get('/api/users', (req, res) => {
    const users = readCsvResilient(USERS_FILE);
    res.json(users.map(({ password, ...u }) => ({ ...u, role: u.role || 'member' })));
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let { name, department, password, role } = req.body;
        name = name ? name.trim() : undefined;
        department = department ? department.trim() : undefined;

        const users = readCsvResilient(USERS_FILE);
        const userIndex = users.findIndex(u => u.id === id);

        if (userIndex === -1) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }

        if (name) users[userIndex].name = name;
        if (department) users[userIndex].department = department;
        if (password && password.trim()) users[userIndex].password = password.trim();
        if (role) users[userIndex].role = role.trim();
        if (!users[userIndex].role) users[userIndex].role = 'member';

        const allColumns = [...USER_COLUMNS, 'role'];
        await writeAtomic(USERS_FILE, stringify(users, { header: true, columns: allColumns }));

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
                records = readCsvResilient(dbFile);
            }
        } else {
            // Load ALL years (dashboard aggregation)
            const files = fs.readdirSync(__dirname).filter(f => f.startsWith('database_') && f.endsWith('.csv') && !f.includes('sample'));
            files.forEach(file => {
                const fileRecords = readCsvResilient(path.join(__dirname, file));
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
            fs.writeFileSync(dbFile, stringify([DB_COLUMNS]));
        }

        let existingRecords = readCsvResilient(dbFile);

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
        await writeAtomic(dbFile, stringify(finalRecords, { header: true, columns: DB_COLUMNS }));

        res.json({ success: true, message: '저장되었습니다.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '저장 실패' });
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
        d.setDate(d.getDate() + diff);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// GET /api/weekly-tasks — 주차·팀 필터 조회
app.get('/api/weekly-tasks', (req, res) => {
    try {
        const { week, team, year } = req.query;
        const y = year || (week ? week.slice(0, 4) : String(new Date().getFullYear()));
        const file = getWeeklyTasksFile(y);
        let tasks = readCsvResilient(file);

        // role 없는 데이터 기본값 처리
        tasks = tasks.map(t => ({ ...t, role: t.role || 'member' }));

        if (week) tasks = tasks.filter(t => t.week_start === week);
        if (team) tasks = tasks.filter(t => t.team === team);

        res.json(tasks);
    } catch (e) {
        console.error('[API] GET /api/weekly-tasks:', e);
        res.status(500).json({ error: '업무 목록 조회 실패' });
    }
});

// GET /api/weekly-tasks/weeks — 등록된 주차 목록
app.get('/api/weekly-tasks/weeks', (req, res) => {
    try {
        const files = fs.readdirSync(__dirname).filter(f => f.startsWith('weekly_tasks_') && f.endsWith('.csv'));
        const weeks = new Set();
        files.forEach(f => {
            const records = readCsvResilient(path.join(__dirname, f));
            records.forEach(r => { if (r.week_start) weeks.add(r.week_start); });
        });
        const sorted = [...weeks].sort().reverse();
        res.json(sorted);
    } catch (e) {
        res.status(500).json({ error: '주차 목록 조회 실패' });
    }
});

// POST /api/weekly-tasks — 업무 등록
app.post('/api/weekly-tasks', async (req, res) => {
    try {
        const { team, category, sub_category, task_code, content, assignees,
                status, priority, start_date, end_date, meeting_result, note } = req.body;
        if (!content) return res.status(400).json({ error: '주요내용은 필수입니다.' });

        const year = start_date ? start_date.slice(0, 4) : String(new Date().getFullYear());
        const file = getWeeklyTasksFile(year);
        if (!fs.existsSync(file)) fs.writeFileSync(file, WEEKLY_TASKS_COLUMNS.join(',') + '\n');

        const records = readCsvResilient(file);
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
        await writeAtomic(file, stringify(updated, { header: true, columns: WEEKLY_TASKS_COLUMNS }));
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
        const records = readCsvResilient(file);
        const idx = records.findIndex(r => r.id === id);
        if (idx === -1) return res.status(404).json({ error: '업무를 찾을 수 없습니다.' });

        records[idx] = { ...records[idx], ...updates };
        if (updates.start_date) records[idx].week_start = getWeekStartStr(updates.start_date);

        await writeAtomic(file, stringify(records, { header: true, columns: WEEKLY_TASKS_COLUMNS }));
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
        const records = readCsvResilient(file);
        
        const filtered = records.filter(r => r.id && r.id.trim() !== id.trim());
        
        if (filtered.length === records.length) {
            console.log(`[API] Task Delete Failed: ID ${id} not found.`);
            return res.status(404).json({ error: '업무를 찾을 수 없습니다.' });
        }
        
        await writeAtomic(file, stringify(filtered, { header: true, columns: WEEKLY_TASKS_COLUMNS }));
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
        let records = readCsvResilient(SCHEDULE_FILE);
        if (year) records = records.filter(r => r.year === year);
        if (week) records = records.filter(r => r.week_start === week);
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
        const records = readCsvResilient(SCHEDULE_FILE);
        const id = Date.now().toString();
        const weekStart = getWeekStartStr(start_date);
        const year = start_date ? start_date.slice(0, 4) : String(new Date().getFullYear());
        const now = new Date().toISOString().slice(0, 10);
        const newRecord = { id, schedule_type: schedule_type || '', content, start_date: start_date || '',
            end_date: end_date || '', location: location || '', assignees: assignees || '',
            week_start: weekStart, year, created_at: now };
        const updated = [...records, newRecord];
        await writeAtomic(SCHEDULE_FILE, stringify(updated, { header: true, columns: SCHEDULE_COLUMNS }));
        res.json({ success: true, record: newRecord });
    } catch (e) {
        res.status(500).json({ error: '일정 등록 실패' });
    }
});

// DELETE /api/weekly-schedule/:id
app.delete('/api/weekly-schedule/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const records = readCsvResilient(SCHEDULE_FILE);
        const filtered = records.filter(r => r.id && r.id.trim() !== id.trim());

        if (filtered.length === records.length) {
            console.log(`[API] Schedule Delete Failed: ID ${id} not found.`);
            return res.status(404).json({ error: '일정을 찾을 수 없습니다.' });
        }

        await writeAtomic(SCHEDULE_FILE, stringify(filtered, { header: true, columns: SCHEDULE_COLUMNS }));
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
        const projects = readCsvResilient(PROJECTS_FILE);
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
        const records = readCsvResilient(PROJECTS_FILE);
        const id = Date.now().toString();
        const now = new Date().toISOString().slice(0, 10);
        const newProject = { id, category: category || '', sub_no: sub_no || '', project_code: project_code || '',
            project_name, method: method || '', bim_cost: bim_cost || '', dept: dept || '',
            manager: manager || '', status_detail: status_detail || '', created_at: now };
        const updated = [...records, newProject];
        await writeAtomic(PROJECTS_FILE, stringify(updated, { header: true, columns: PROJECTS_COLUMNS }));
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
        const records = readCsvResilient(PROJECTS_FILE);
        const idx = records.findIndex(r => r.id === id);
        if (idx === -1) return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
        records[idx] = { ...records[idx], ...updates };
        await writeAtomic(PROJECTS_FILE, stringify(records, { header: true, columns: PROJECTS_COLUMNS }));
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
        const records = readCsvResilient(PROJECTS_FILE);
        
        const filtered = records.filter(r => r.id && r.id.trim() !== id.trim());
        
        if (filtered.length === records.length) {
            console.log(`[API] Delete Failed: ID ${id} not found among: ${records.map(r=>r.id).slice(0,5).join(', ')}...`);
            return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
        }
        
        await writeAtomic(PROJECTS_FILE, stringify(filtered, { header: true, columns: PROJECTS_COLUMNS }));
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
