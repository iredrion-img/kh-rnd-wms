/**
 * csv_to_json.cjs
 * 기존 CSV 데이터 파일을 새 WMS용 JSON 형식으로 일괄 변환하는 일회성 마이그레이션 스크립트
 * 실행: node csv_to_json.cjs
 */
const fs = require('fs');
const path = require('path');

const DIR = __dirname;

// ─── 헬퍼: CSV 한 줄을 컬럼 배열로 파싱 (쌍따옴표 안의 콤마 처리) ───
function parseCsvLine(line) {
  const result = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

// ─── 헬퍼: CSV 파일을 읽어 문자열 반환 (BOM 제거, 인코딩 자동처리) ───
function readCsv(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  // UTF-8 BOM 제거
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
  return content;
}

// ─────────────────────────────────────────────
// 1. database_2026.csv  →  database_2026.json
// ─────────────────────────────────────────────
const DB_FIELDS = [
  'employee', 'department', 'project_name', 'project_code',
  'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'total', 'week_start'
];

function convertDatabase(year) {
  const csvPath  = path.join(DIR, `database_${year}.csv`);
  const jsonPath = path.join(DIR, `database_${year}.json`);

  if (!fs.existsSync(csvPath)) {
    console.log(`⏭  database_${year}.csv 없음 - 건너뜀`);
    return 0;
  }

  const lines = readCsv(csvPath)
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  // 첫 줄이 헤더인지 확인 (숫자가 없으면 헤더로 판단)
  const firstCols = parseCsvLine(lines[0]);
  const hasHeader = isNaN(Number(firstCols[4])); // mon 컬럼이 숫자가 아니면 헤더
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const result = dataLines
    .map(line => {
      const cols = parseCsvLine(line);
      if (cols.length < 9) return null;
      const obj = {};
      DB_FIELDS.forEach((field, i) => {
        obj[field] = (cols[i] !== undefined ? cols[i] : '').replace(/^"|"$/g, '');
      });
      return obj;
    })
    .filter(obj => obj && obj.employee && obj.week_start);

  // 기존 JSON 파일이 이미 데이터가 있으면 병합하지 않고 백업 후 교체
  if (fs.existsSync(jsonPath)) {
    const existing = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (existing.length > 0) {
      const backupPath = jsonPath.replace('.json', '_before_migration.json');
      fs.copyFileSync(jsonPath, backupPath);
      console.log(`  📦 기존 JSON 백업 완료: ${path.basename(backupPath)}`);
    }
  }

  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`✅ database_${year}.json: ${result.length}건 변환 완료`);
  return result.length;
}

// ─────────────────────────────────────────────
// 2. users.csv  →  users.json
// ─────────────────────────────────────────────
function convertUsers() {
  const csvPath  = path.join(DIR, 'users.csv');
  const jsonPath = path.join(DIR, 'users.json');

  if (!fs.existsSync(csvPath)) {
    console.log('⏭  users.csv 없음 - 건너뜀');
    return 0;
  }

  const lines = readCsv(csvPath)
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  // 첫 줄로 컬럼 구조 파악
  const firstCols = parseCsvLine(lines[0]);
  console.log('\n  📋 users.csv 첫 번째 줄 컬럼 구조:', firstCols);

  // 헤더 여부 확인 (id 컬럼이 숫자가 아니면 헤더로 판단)
  const hasHeader = isNaN(Number(firstCols[0]));
  const headers   = hasHeader ? firstCols.map(h => h.toLowerCase().trim()) : null;
  const dataLines = hasHeader ? lines.slice(1) : lines;

  // 기본 컬럼 순서 (헤더가 없을 경우 사용)
  const DEFAULT_FIELDS = ['id', 'name', 'department', 'password', 'role'];

  const result = dataLines
    .map(line => {
      const cols = parseCsvLine(line);
      if (cols.length < 2) return null;
      const obj = {};
      if (headers) {
        headers.forEach((h, i) => { obj[h] = (cols[i] || '').replace(/^"|"$/g, ''); });
      } else {
        DEFAULT_FIELDS.forEach((f, i) => { obj[f] = (cols[i] || '').replace(/^"|"$/g, ''); });
      }
      return obj;
    })
    .filter(obj => obj && obj.name);

  if (fs.existsSync(jsonPath)) {
    const existing = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (existing.length > 0) {
      const backupPath = jsonPath.replace('.json', '_before_migration.json');
      fs.copyFileSync(jsonPath, backupPath);
      console.log(`  📦 기존 users.json 백업: ${path.basename(backupPath)}`);
    }
  }

  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`✅ users.json: ${result.length}명 변환 완료`);
  return result.length;
}

// ─────────────────────────────────────────────
// 실행
// ─────────────────────────────────────────────
console.log('=== CSV → JSON 데이터 마이그레이션 시작 ===\n');

let total = 0;
total += convertDatabase(2026);
total += convertDatabase(2025);
console.log('');
convertUsers();

console.log(`\n=== 마이그레이션 완료! 총 타임시트 ${total}건 변환 ===`);
console.log('서버를 재시작하면 변환된 데이터가 WMS에 바로 반영됩니다.');
