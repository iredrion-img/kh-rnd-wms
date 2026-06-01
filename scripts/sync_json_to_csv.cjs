/**
 * sync_json_to_csv.cjs
 * JSON 데이터 파일들을 읽어 CSV로 일괄 동기화 (내보내기) 스크립트
 * 
 * 대상 파일: database_*.json, weekly_tasks_*.json, weekly_schedule.json, projects.json, circulation_data.json 등
 * 사용법: node scripts/sync_json_to_csv.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// 동기화 대상이 되는 JSON 파일명 패턴들
const TARGET_PREFIXES = [
    'database_',
    'weekly_tasks_',
    'weekly_schedule',
    'projects',
    'circulation_data',
    'meeting_overview'
];

function shouldProcessFile(filename) {
    if (!filename.endsWith('.json')) return false;
    if (filename.includes('backup')) return false;
    return TARGET_PREFIXES.some(prefix => filename.startsWith(prefix));
}

/**
 * 레코드 배열을 동적 헤더 기반으로 CSV 문자열로 변환
 */
function jsonToCsv(records) {
    if (!records || records.length === 0) return '';

    // 모든 레코드에서 고유 키(헤더) 추출
    const keysSet = new Set();
    records.forEach(r => {
        if (typeof r === 'object' && r !== null) {
            Object.keys(r).forEach(k => keysSet.add(k));
        }
    });
    const headers = Array.from(keysSet);

    const escape = (val) => {
        const str = val === undefined || val === null ? '' : String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    };

    const headerLine = headers.join(',');
    const dataLines = records.map(r =>
        headers.map(col => escape(r[col])).join(',')
    );
    return [headerLine, ...dataLines].join('\r\n');
}

/**
 * 단일 파일 동기화 함수
 */
function syncFile(jsonFile) {
    const csvFile = jsonFile.replace(/\.json$/, '.csv');

    let records;
    try {
        const content = fs.readFileSync(jsonFile, 'utf8');
        records = JSON.parse(content);
        if (!Array.isArray(records)) {
            console.log(`[Skip] ${path.basename(jsonFile)}: 배열 형태가 아님`);
            return false;
        }
        if (records.length === 0) {
            console.log(`[Skip] ${path.basename(jsonFile)}: 데이터 없음`);
            return false;
        }
    } catch (e) {
        console.error(`[ERROR] JSON 파싱 실패 (${path.basename(jsonFile)}):`, e.message);
        return false;
    }

    const csvContent = jsonToCsv(records);

    // UTF-8 BOM 포함으로 저장 (Excel에서 한글 깨짐 방지)
    const BOM = '\uFEFF';
    fs.writeFileSync(csvFile, BOM + csvContent, 'utf8');

    console.log(`[OK] ${path.basename(csvFile)} (${records.length}건)`);
    return true;
}

// --- Main ---
console.log(`\n=== JSON → CSV 전체 동기화 시작 ===\n`);

const files = fs.readdirSync(ROOT_DIR);
const targetFiles = files.filter(shouldProcessFile);

let successCount = 0;

for (const file of targetFiles) {
    const jsonPath = path.join(ROOT_DIR, file);
    if (syncFile(jsonPath)) {
        successCount++;
    }
}

console.log(`\n✅ 동기화 완료! (총 ${successCount}개 파일 CSV 생성)`);
console.log('   Excel에서 열 때 인코딩: UTF-8 (BOM 포함 - 한글 정상 표시)\n');
