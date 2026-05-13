const fs = require('fs');

const filesToVerify = [
    { csv: 'database_2026.csv', json: 'database_2026.json' },
    { csv: 'weekly_tasks_2026.csv', json: 'weekly_tasks_2026.json' },
    { csv: 'weekly_schedule.csv', json: 'weekly_schedule.json' },
    { csv: 'projects.csv', json: 'projects.json' },
    { csv: 'users.csv', json: 'users.json' }
];

console.log('--- Migration Verification ---');
filesToVerify.forEach(pair => {
    if (fs.existsSync(pair.json)) {
        const jsonData = JSON.parse(fs.readFileSync(pair.json, 'utf8'));
        let csvCount = 'N/A';
        
        if (fs.existsSync(pair.csv)) {
            const csvData = fs.readFileSync(pair.csv, 'utf8').split('\n').filter(line => line.trim().length > 0);
            csvCount = csvData.length - 1; // Subtract header
        }

        console.log(`[${pair.json}] Records: ${jsonData.length} (Original CSV: ${csvCount})`);
        
        if (jsonData.length > 0) {
            console.log(`  Sample:`, JSON.stringify(jsonData[0]).substring(0, 80) + '...');
        }
    } else {
        console.log(`[${pair.json}] FILE MISSING!`);
    }
});
