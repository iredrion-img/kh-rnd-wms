const fs = require('fs');
const path = require('path');

const targets = ['강병주', '김동찬'];
const usersFile = path.join(__dirname, '../users.json');
const tasksFile = path.join(__dirname, '../weekly_tasks_2026.json');
const projectsFile = path.join(__dirname, '../projects.json');
const scheduleFile = path.join(__dirname, '../weekly_schedule.json');

try {
    if (fs.existsSync(usersFile)) {
        let users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        users = users.filter(u => !targets.includes(u.name));
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
        console.log('[OK] users.json Updated');
    }

    if (fs.existsSync(tasksFile)) {
        let tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
        tasks.forEach(t => {
            if (t.assignees && targets.some(name => t.assignees.includes(name))) t.is_hidden = true;
        });
        fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));
        console.log('[OK] Tasks Updated');
    }

    if (fs.existsSync(projectsFile)) {
        let projects = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
        projects.forEach(p => {
            if (p.manager && targets.some(name => p.manager.includes(name))) p.is_hidden = true;
        });
        fs.writeFileSync(projectsFile, JSON.stringify(projects, null, 2));
        console.log('[OK] Projects Updated');
    }

    if (fs.existsSync(scheduleFile)) {
        let schedules = JSON.parse(fs.readFileSync(scheduleFile, 'utf8'));
        schedules.forEach(s => {
            if (s.assignees && targets.some(name => s.assignees.includes(name))) s.is_hidden = true;
        });
        fs.writeFileSync(scheduleFile, JSON.stringify(schedules, null, 2));
        console.log('[OK] Schedule Updated');
    }
} catch (e) {
    console.error('Error:', e.message);
}
