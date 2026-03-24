const cp = require('child_process');
const fs = require('fs');

const output = cp.execSync('wmic process where name="node.exe" get processid,commandline').toString();
const lines = output.split('\n');
let killed = false;
for (let line of lines) {
    if (line.includes('ai-relay') && !line.includes('wmic')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        try {
            process.kill(Number(pid), 'SIGKILL');
            console.log('Killed PID:', pid);
            killed = true;
        } catch(e) {}
    }
}

setTimeout(() => {
    try {
        fs.renameSync('C:/KH_RnD/ai-relay', 'C:/KH_RnD/ai-relay-old');
        console.log('RENAMED_SUCCESSFULLY');
    } catch(e) {
        console.error('ERROR RENAME:', e.message);
    }
}, killed ? 1500 : 500);
