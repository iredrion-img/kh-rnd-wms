import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import { stringify } from 'csv-stringify/sync';
import { parse } from 'csv-parse/sync';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import cron from 'node-cron'; // Import node-cron
import https from 'https'; // Import https
import os from 'os'; // Import os for IP detection
import { writeAtomic } from './src/utils/safeStorage.js';

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

// --- INITIALIZATION ---
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

// Initialize current year DB if not exists
const currentYear = new Date().getFullYear();
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

// --- MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json());

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
        let { name, department, password } = req.body;
        name = name.trim();
        department = department.trim();

        const users = readCsvResilient(USERS_FILE);
        if (users.some(u => u.name.trim().replace(/\s+/g, '') === name.replace(/\s+/g, ''))) {
            return res.status(409).json({ success: false, message: '이미 존재하는 이름입니다.' });
        }

        const id = Date.now().toString();
        const userRow = stringify([{ id, name, department, password }], { header: false, columns: USER_COLUMNS });
        fs.appendFileSync(USERS_FILE, userRow);

        res.json({ success: true, user: { id, name, department } });
    } catch (error) {
        res.status(500).json({ error: '사용자 추가 실패' });
    }
});

app.get('/api/users', (req, res) => {
    const users = readCsvResilient(USERS_FILE);
    res.json(users.map(({ password, ...u }) => u));
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let { name, department, password } = req.body;
        name = name ? name.trim() : undefined;
        department = department ? department.trim() : undefined;

        const users = readCsvResilient(USERS_FILE);
        const userIndex = users.findIndex(u => u.id === id);

        if (userIndex === -1) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }

        // Update fields
        if (name) users[userIndex].name = name;
        if (department) users[userIndex].department = department;
        if (password && password.trim()) users[userIndex].password = password.trim();

        await writeAtomic(USERS_FILE, stringify(users, { header: true, columns: USER_COLUMNS }));

        const { password: _, ...updatedUser } = users[userIndex];
        res.json({ success: true, user: updatedUser });
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

// --- STATIC & START ---
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get(/(.*)/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
