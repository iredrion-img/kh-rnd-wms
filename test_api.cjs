const http = require('http');

http.get('http://localhost:3001/api/weekly-tasks?week=2026-04-20&team=' + encodeURIComponent('AI 응용팀'), (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        try {
            console.log(rawData);
        } catch (e) {
            console.error(e.message);
        }
    });
}).on('error', (e) => {
    console.error(`Got error: ${e.message}`);
});
