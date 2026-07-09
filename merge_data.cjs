const fs = require('fs');
const path = require('path');

// 사용법: node merge_data.cjs [백업폴더경로]
// 예시: node merge_data.cjs backups/2026-07-08

const backupDirArg = process.argv[2];
if (!backupDirArg) {
    console.error("오류: 백업 폴더 경로를 입력해주세요.");
    console.log("사용법: node merge_data.cjs backups/2026-07-08");
    process.exit(1);
}

const DIR = __dirname;
const BACKUP_DIR = path.resolve(DIR, backupDirArg);

const FILES_TO_MERGE = [
    'database_2026.json',
    'weekly_tasks_2026.json',
    'weekly_schedule.json',
    'meeting_overview.json'
];

function readJson(file) {
    if (!fs.existsSync(file)) return [];
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        console.error(`Failed to read ${file}:`, e);
        return [];
    }
}

function writeJson(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

FILES_TO_MERGE.forEach(filename => {
    const backupFile = path.join(BACKUP_DIR, filename);
    const currentFile = path.join(DIR, filename);

    if (!fs.existsSync(backupFile)) {
        console.log(`[건너뜀] 백업 파일이 없습니다: ${backupFile}`);
        return;
    }

    const backupData = readJson(backupFile);
    const currentData = readJson(currentFile);

    // Merge logic
    let merged = [...currentData];
    let addedCount = 0;

    backupData.forEach(backupRecord => {
        // Unique identifier for each record
        let isDuplicate = false;

        if (filename === 'database_2026.json') {
            // employee, week_start, project_name combination
            isDuplicate = merged.some(curr => 
                curr.employee === backupRecord.employee && 
                curr.week_start === backupRecord.week_start && 
                curr.project_name === backupRecord.project_name
            );
        } else if (filename === 'meeting_overview.json') {
            // week
            isDuplicate = merged.some(curr => curr.week === backupRecord.week);
        } else {
            // task / schedule usually have 'id'
            if (backupRecord.id) {
                isDuplicate = merged.some(curr => curr.id === backupRecord.id);
            }
        }

        if (!isDuplicate) {
            merged.push(backupRecord);
            addedCount++;
        }
    });

    if (addedCount > 0) {
        writeJson(currentFile, merged);
        console.log(`[병합완료] ${filename}: ${addedCount}개의 과거 데이터를 복구했습니다.`);
    } else {
        console.log(`[병합완료] ${filename}: 추가할 새로운 데이터가 없습니다 (모두 중복).`);
    }
});

console.log("모든 병합 작업이 완료되었습니다.");
