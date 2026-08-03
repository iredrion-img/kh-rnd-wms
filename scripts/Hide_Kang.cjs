const fs = require('fs');
const path = require('path');

const usersFile = path.join(__dirname, '../users.json');
const tasksFile = path.join(__dirname, '../weekly_tasks_2026.json');
const projectsFile = path.join(__dirname, '../projects.json');

try {
    if (fs.existsSync(usersFile)) {
        let users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        users = users.filter(u => u.name !== '강병주');
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
        console.log('[OK] users.json Updated');
    }

    if (fs.existsSync(tasksFile)) {
        let tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
        tasks.forEach(t => {
            if (t.assignees && t.assignees.includes('강병주')) t.is_hidden = true;
        });
        fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));
        console.log('[OK] Tasks Updated');
    }

    if (fs.existsSync(projectsFile)) {
        let projects = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
        projects.forEach(p => {
            if (p.manager && p.manager.includes('강병주')) p.is_hidden = true;
        });
        fs.writeFileSync(projectsFile, JSON.stringify(projects, null, 2));
        console.log('[OK] Projects Updated');
    }
} catch (e) {
    console.error('Error:', e.message);
}
