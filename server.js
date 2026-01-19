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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001; // HTTPS Port
const DB_FILE = path.join(__dirname, 'database.csv');

app.use(cors());
app.use(bodyParser.json());

// --- Backup Service ---
const BACKUP_DIR = path.join(__dirname, 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
}

const performBackup = () => {
    try {
        const timestamp = new Date().toISOString().slice(0, 7); // YYYY-MM
        const filesToBackup = ['users.csv', 'database.csv'];

        console.log(`[Backup] Starting backup for ${timestamp}...`);

        filesToBackup.forEach(file => {
            const sourcePath = path.join(__dirname, file);
            if (fs.existsSync(sourcePath)) {
                const destPath = path.join(BACKUP_DIR, `${timestamp}_${file}`);
                fs.copyFileSync(sourcePath, destPath);
                console.log(`[Backup] Copied ${file} to ${destPath}`);
            } else {
                console.warn(`[Backup] Source file not found: ${file}`);
            }
        });
        return true;
    } catch (error) {
        console.error('[Backup] Failed:', error);
        return false;
    }
};

// Schedule: At 00:00 on day-of-month 1 (Monthly)
cron.schedule('0 0 1 * *', () => {
    console.log('[Scheduler] Running monthly backup...');
    performBackup();
});

// Manual Backup Endpoint (for testing/admin)
app.post('/api/admin/backup', (req, res) => {
    const success = performBackup();
    if (success) res.json({ success: true, message: 'Backup completed' });
    else res.status(500).json({ error: 'Backup failed' });
});
// ----------------------

// Initialize DB if not exists
if (!fs.existsSync(DB_FILE)) {
    const columns = ['employee', 'department', 'project_name', 'project_code', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'total', 'week_start'];
    fs.writeFileSync(DB_FILE, stringify([columns]));
}

// GET: Fetch all timesheets
app.get('/api/timesheets', (req, res) => {
    try {
        const fileContent = fs.readFileSync(DB_FILE, 'utf8');
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true
        });
        res.json(records);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read database' });
    }
});

// POST: Save timesheet entry
app.post('/api/timesheets', (req, res) => {
    try {
        const { rows, weekStart, employee, department } = req.body;

        // Read existing data
        let existingRecords = [];
        if (fs.existsSync(DB_FILE)) {
            const fileContent = fs.readFileSync(DB_FILE, 'utf8');
            existingRecords = parse(fileContent, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            });
        }

        // Filter out records for this specific user and week
        const initialCount = existingRecords.length;
        const filteredRecords = existingRecords.filter(record =>
            !(record.employee === employee && record.week_start === weekStart)
        );
        const filteredCount = filteredRecords.length;

        console.log(`[Save] Employee: ${employee}, Week: ${weekStart}`);
        console.log(`[Save] Existing Records: ${initialCount}, After Filter: ${filteredCount} (Removed ${initialCount - filteredCount})`);

        const recordsToSave = rows.map(row => ({
            employee: employee || 'John Doe',
            department: department || 'Engineering',
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

        // Combine and Write
        const finalRecords = [...filteredRecords, ...recordsToSave];
        const columns = ['employee', 'department', 'project_name', 'project_code', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'total', 'week_start'];

        const csvString = stringify(finalRecords, { header: true, columns: columns });
        fs.writeFileSync(DB_FILE, csvString);

        console.log(`Updated timesheet for ${employee} (Week: ${weekStart}). Total records: ${finalRecords.length}`);
        res.json({ success: true, message: 'Saved successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// START: User Management API
const USERS_FILE = path.join(__dirname, 'users.csv');
const USER_COLUMNS = ['id', 'name', 'department', 'password'];

// Initialize Users DB if not exists
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, stringify([USER_COLUMNS]));
}

// Helper to read users
const readUsers = () => {
    if (!fs.existsSync(USERS_FILE)) return [];
    try {
        const content = fs.readFileSync(USERS_FILE, 'utf8');
        return parse(content, {
            columns: true,
            skip_empty_lines: true,
            trim: true // Critical: Trim whitespace from CSV values
        });
    } catch (e) {
        return [];
    }
};

// GET: Fetch all users (Excluding password)
app.get('/api/users', (req, res) => {
    try {
        const users = readUsers();
        // Return users without password field
        const publicUsers = users.map(({ password, ...user }) => user);
        res.json(publicUsers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read users' });
    }
});

// POST: Login verify
app.post('/api/login', (req, res) => {
    try {
        const { id, password } = req.body;
        const users = readUsers();
        const user = users.find(u => u.id === id);

        if (user && user.password === password) {
            const { password, ...userWithoutPassword } = user;
            res.json({ success: true, user: userWithoutPassword });
        } else {
            res.status(401).json({ success: false, message: '비밀번호가 일치하지 않습니다.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// POST: Add new user
app.post('/api/users', (req, res) => {
    try {
        let { name, department, password } = req.body;

        // Normalize input
        name = name.trim();
        department = department.trim();

        // Check for duplicates
        const users = readUsers();
        if (users.some(user => user.name === name)) {
            return res.status(409).json({ success: false, message: '이미 존재하는 사용자 이름입니다.' });
        }

        const id = Date.now().toString(); // Simple ID generation

        // Append to file
        const userRow = stringify([{ id, name, department, password }], { header: false, columns: USER_COLUMNS });

        // Check if file needs headers (e.g. was empty)
        if (fs.existsSync(USERS_FILE) && fs.statSync(USERS_FILE).size > 0) {
            fs.appendFileSync(USERS_FILE, userRow);
        } else {
            fs.writeFileSync(USERS_FILE, stringify([{ id, name, department, password }], { header: true, columns: USER_COLUMNS }));
        }

        res.json({ success: true, user: { id, name, department } }); // Do not return password
    } catch (error) {
        res.status(500).json({ error: 'Failed to add user' });
    }
});

// PUT: Update user
app.put('/api/users/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, department } = req.body;
        let users = readUsers();
        let updated = false;

        users = users.map(user => {
            if (user.id === id) {
                updated = true;
                return { ...user, name, department };
            }
            return user;
        });

        if (!updated) return res.status(404).json({ error: 'User not found' });

        // Rewrite file with explicit columns to preserve header if empty
        const csvString = stringify(users, { header: true, columns: USER_COLUMNS });
        fs.writeFileSync(USERS_FILE, csvString);

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// DELETE: Delete user
app.delete('/api/users/:id', (req, res) => {
    try {
        const { id } = req.params;
        let users = readUsers();
        const initialLength = users.length;
        users = users.filter(user => user.id !== id);

        if (users.length === initialLength) return res.status(404).json({ error: 'User not found' });

        // Rewrite file with explicit columns to preserve header if empty
        const csvString = stringify(users, { header: true, columns: USER_COLUMNS });
        fs.writeFileSync(USERS_FILE, csvString);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});
// END: User Management API

// Serve static files from React app
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    // The "catchall" handler: for any request that doesn't match above, send back React's index.html file.
    app.get(/(.*)/, (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
} else {
    // Fallback for dev mode
    console.log('Running in API-only/Dev mode.');
}

// Start Server (HTTP only - ngrok will handle HTTPS)
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
