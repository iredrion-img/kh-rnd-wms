import fs from 'fs';

const files = ['weekly_tasks_2026.csv', 'weekly_schedule.csv', 'projects_2026.csv'];

files.forEach(f => {
    if (fs.existsSync(f)) {
        const buffer = fs.readFileSync(f);
        const hex = buffer.slice(0, 16).toString('hex').toUpperCase();
        console.log(`${f}: ${hex}`);
    } else {
        console.log(`${f} not found`);
    }
});
