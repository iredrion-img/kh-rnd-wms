/**
 * sync_json_to_csv.cjs
 * JSON database 파일을 읽어 CSV로 동기화 (내보내기) 스크립트
 * 
 * 사용법: node scripts/sync_json_to_csv.cjs [year]
 *   - year 미입력 시 현재 연도 자동 사용
 *   - 예: node scripts/sync_json_to_csv.cjs 2026
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// CSV 헤더 (컬럼 순서 고정)
const CSV_HEADERS = ['employee', 'department', 'project_name', 'project_code', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'total', 'week_start'];

/**
 * 레코드 배열을 CSV 문자열로 변환
 */
function jsonToCsv(records) {
    const escape = (val) => {
        const str = val === undefined || val === null ? '' : String(val);
        // 쉼표, 따옴표, 줄바꿈이 포함된 경우 큰따옴표로 감쌈
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    };

    const headerLine = CSV_HEADERS.join(',');
    const dataLines = records.map(r =>
        CSV_HEADERS.map(col => escape(r[col])).join(',')
    );
    return [headerLine, ...dataLines].join('\r\n');
}

/**
 * 단일 연도 JSON → CSV 동기화
 */
function syncYear(year) {
    const jsonFile = path.join(ROOT_DIR, `database_${year}.json`);
    const csvFile  = path.join(ROOT_DIR, `database_${year}.csv`);

    if (!fs.existsSync(jsonFile)) {
        console.error(`[ERROR] JSON 파일 없음: ${jsonFile}`);
        return false;
    }

    let records;
    try {
        const content = fs.readFileSync(jsonFile, 'utf8');
        records = JSON.parse(content);
        if (!Array.isArray(records)) throw new Error('JSON 배열이 아님');
    } catch (e) {
        console.error(`[ERROR] JSON 파싱 실패 (${jsonFile}):`, e.message);
        return false;
    }

    const csvContent = jsonToCsv(records);

    // 백업: 기존 CSV 파일이 있으면 .bak 으로 보존
    if (fs.existsSync(csvFile)) {
        const backupPath = csvFile + '.bak';
        fs.copyFileSync(csvFile, backupPath);
        console.log(`[Backup] 기존 CSV 백업: ${backupPath}`);
    }

    // UTF-8 BOM 포함으로 저장 (Excel에서 한글 깨짐 방지)
    const BOM = '\uFEFF';
    fs.writeFileSync(csvFile, BOM + csvContent, 'utf8');

    const weeks = [...new Set(records.map(r => r.week_start))].sort();
    console.log(`[OK] ${csvFile}`);
    console.log(`     총 레코드: ${records.length}건`);
    console.log(`     포함 주차 (${weeks.length}개): ${weeks.join(', ')}`);
    console.log(`     마지막 주차: ${weeks[weeks.length - 1]}`);
    return true;
}

// --- Main ---
const args = process.argv.slice(2);
const yearArg = args[0] ? parseInt(args[0]) : new Date().getFullYear();

if (isNaN(yearArg) || yearArg < 2020 || yearArg > 2099) {
    console.error('[ERROR] 유효하지 않은 연도:', args[0]);
    process.exit(1);
}

console.log(`\n=== JSON → CSV 동기화 시작 (${yearArg}년) ===\n`);
const success = syncYear(yearArg);
if (success) {
    console.log('\n✅ 동기화 완료!');
    console.log(`   파일: database_${yearArg}.csv`);
    console.log('   Excel에서 열 때 인코딩: UTF-8 (BOM 포함 - 한글 정상 표시)\n');
} else {
    console.log('\n❌ 동기화 실패. 위의 에러 메시지를 확인하세요.\n');
    process.exit(1);
}
