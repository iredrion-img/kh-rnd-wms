/**
 * sync_json_to_csv.cjs
 * JSON 데이터 파일들을 읽어 CSV로 일괄 동기화 (내보내기) 스크립트
 * 
 * - 배열 형태의 JSON → 동일한 이름의 CSV (예: database_2026.json → database_2026.csv)
 * - 객체 형태의 JSON → 섹션별 CSV (예: circulation_data.json → circulation_data_surveyData.csv 등)
 * 
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
        // 값이 객체/배열이면 JSON 문자열로 변환
        if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
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
 * CSV 문자열을 파일로 저장
 */
function writeCsv(csvPath, content) {
    const BOM = '\uFEFF';
    fs.writeFileSync(csvPath, BOM + content, 'utf8');
}

/**
 * 단일 파일 동기화 함수
 * - 배열 → 그대로 CSV 1개 생성
 * - 객체 → 각 키별로 값이 배열인 경우에만 별도 CSV 생성
 */
function syncFile(jsonFile) {
    let data;
    try {
        const content = fs.readFileSync(jsonFile, 'utf8');
        data = JSON.parse(content);
    } catch (e) {
        console.error(`[ERROR] JSON 파싱 실패 (${path.basename(jsonFile)}):`, e.message);
        return 0;
    }

    const baseName = path.basename(jsonFile, '.json');
    let count = 0;

    // ── 배열 형태 ──
    if (Array.isArray(data)) {
        if (data.length === 0) {
            console.log(`[Skip] ${path.basename(jsonFile)}: 데이터 없음`);
            return 0;
        }
        const csvPath = path.join(ROOT_DIR, `${baseName}.csv`);
        writeCsv(csvPath, jsonToCsv(data));
        console.log(`[OK] ${baseName}.csv (${data.length}건)`);
        return 1;
    }

    // ── 객체 형태 → 키별로 분리 ──
    if (typeof data === 'object' && data !== null) {
        for (const [key, value] of Object.entries(data)) {
            if (!Array.isArray(value) || value.length === 0) {
                console.log(`  [Skip] ${baseName}.${key}: 배열이 아니거나 데이터 없음`);
                continue;
            }
            const csvPath = path.join(ROOT_DIR, `${baseName}_${key}.csv`);
            writeCsv(csvPath, jsonToCsv(value));
            console.log(`[OK] ${baseName}_${key}.csv (${value.length}건)`);
            count++;
        }
        return count;
    }

    console.log(`[Skip] ${path.basename(jsonFile)}: 지원하지 않는 구조`);
    return 0;
}

// --- Main ---
console.log(`\n=== JSON → CSV 전체 동기화 시작 ===\n`);

const files = fs.readdirSync(ROOT_DIR);
const targetFiles = files.filter(shouldProcessFile);

let totalSuccess = 0;

for (const file of targetFiles) {
    const jsonPath = path.join(ROOT_DIR, file);
    totalSuccess += syncFile(jsonPath);
}

console.log(`\n✅ 동기화 완료! (총 ${totalSuccess}개 CSV 파일 생성)`);
console.log('   Excel에서 열 때 인코딩: UTF-8 (BOM 포함 - 한글 정상 표시)\n');
