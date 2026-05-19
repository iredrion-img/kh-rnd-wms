/**
 * migrate_users_from_csv.cjs
 * 
 * 서버 컴퓨터에서 실행: node migrate_users_from_csv.cjs
 * 
 * user.csv의 기존 비밀번호를 유지하면서 users.json을 업데이트합니다.
 * - 기존 CSV에 있는 사용자: 비밀번호 유지, 팀/직급 정보 추가
 * - CSV에 없는 사용자: 비밀번호 '1234' 임시 설정
 */

const fs = require('fs');
const path = require('path');

const CSV_FILE   = path.join(__dirname, 'user.csv');   // 서버의 user.csv 경로 (단수)
const CSV_FILE2  = path.join(__dirname, 'users.csv');  // 또는 users.csv (복수)
const USERS_FILE = path.join(__dirname, 'users.json');

// ── 1. CSV 파일 찾기 ──────────────────────────────────
let csvPath = null;
if (fs.existsSync(CSV_FILE))       csvPath = CSV_FILE;
else if (fs.existsSync(CSV_FILE2)) csvPath = CSV_FILE2;

if (!csvPath) {
  console.error('❌ user.csv 또는 users.csv 파일을 찾을 수 없습니다.');
  console.error('   이 스크립트와 같은 폴더에 CSV 파일을 넣어주세요.');
  process.exit(1);
}
console.log('✅ CSV 파일 발견:', csvPath);

// ── 2. CSV 파싱 (이름 → 비밀번호 맵 생성) ────────────
const csvContent = fs.readFileSync(csvPath, 'utf8');
const lines = csvContent.split('\n').map(l => l.trim()).filter(Boolean);

// 헤더 행 확인
const header = lines[0].split(',').map(h => h.trim().toLowerCase());
console.log('CSV 헤더:', header);

const nameIdx     = header.findIndex(h => h.includes('name') || h === '이름');
const passwordIdx = header.findIndex(h => h.includes('password') || h === '비밀번호' || h === '비번');

if (nameIdx === -1 || passwordIdx === -1) {
  console.error('❌ CSV에서 name/password 컬럼을 찾을 수 없습니다. 헤더를 확인해주세요:', header);
  process.exit(1);
}

// 이름 → 비밀번호 맵
const passwordMap = {};
lines.slice(1).forEach(line => {
  const cols = line.split(',').map(c => c.trim());
  const name = cols[nameIdx];
  const pw   = cols[passwordIdx];
  if (name && pw) {
    passwordMap[name] = pw;
    console.log(`  CSV 로드: ${name} → ****`);
  }
});
console.log(`\n총 ${Object.keys(passwordMap).length}명의 비밀번호 로드됨\n`);

// ── 3. 실제 직원 목록 (팀/직급 정보 포함) ────────────
const EMPLOYEES = [
  { name: '김영근',  department: 'R&D센터',        rank: '부사장',   role: 'member' },
  { name: '최형태',  department: '기술연구소',       rank: '이사',     role: 'member' },
  { name: '임문구',  department: '스마트기술개발팀', rank: '부장',     role: 'admin'  },
  { name: '김진희',  department: '스마트기술개발팀', rank: '부장',     role: 'member' },
  { name: '김경훈',  department: '스마트기술개발팀', rank: '과장',     role: 'admin'  },
  { name: '강수민',  department: '스마트기술개발팀', rank: '대리',     role: 'member' },
  { name: '이정선',  department: '스마트기술개발팀', rank: '대리',     role: 'member' },
  { name: '김하빈',  department: '스마트기술개발팀', rank: '사원',     role: 'member' },
  { name: '노유빈',  department: '스마트기술개발팀', rank: '사원',     role: 'member' },
  { name: '이충재',  department: '디지털기술연구팀', rank: '이사대우', role: 'member' },
  { name: '박도해',  department: '디지털기술연구팀', rank: '차장',     role: 'member' },
  { name: '이동근',  department: '인프라BIM팀',     rank: '이사대우', role: 'member' },
  { name: '김기윤',  department: '인프라BIM팀',     rank: '부장',     role: 'member' },
  { name: '나기태',  department: '인프라BIM팀',     rank: '부장',     role: 'member' },
  { name: '김동찬',  department: '인프라BIM팀',     rank: '차장',     role: 'member' },
  { name: '강병주',  department: '인프라BIM팀',     rank: '과장',     role: 'member' },
  { name: '임규민',  department: '인프라BIM팀',     rank: '과장',     role: 'member' },
  { name: '김동욱',  department: 'AI응용팀',        rank: '이사대우', role: 'member' },
  { name: '장민욱',  department: 'AI응용팀',        rank: '차장',     role: 'member' },
  { name: '한형서',  department: 'AI응용팀',        rank: '사원',     role: 'member' },
];

// ── 4. users.json 생성 ───────────────────────────────
const users = EMPLOYEES.map((emp, i) => {
  const password = passwordMap[emp.name] || '1234';
  const source   = passwordMap[emp.name] ? '기존 CSV' : '임시(1234)';
  console.log(`  ${emp.name}: 비밀번호 = [${source}]`);
  return {
    id:         String(1780000000000 + i * 1000),
    name:       emp.name,
    department: emp.department,
    rank:       emp.rank,
    password:   password,
    role:       emp.role,
  };
});

// ── 5. 백업 후 저장 ──────────────────────────────────
if (fs.existsSync(USERS_FILE)) {
  const backupPath = USERS_FILE.replace('.json', `_backup_${Date.now()}.json`);
  fs.copyFileSync(USERS_FILE, backupPath);
  console.log(`\n백업 완료: ${backupPath}`);
}

fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');

console.log('\n✅ users.json 업데이트 완료!');
console.log(`총 ${users.length}명 등록`);
console.log(`CSV 비밀번호 적용: ${Object.keys(passwordMap).length}명`);
console.log(`임시 비밀번호(1234): ${users.length - Object.keys(passwordMap).filter(n => EMPLOYEES.some(e => e.name === n)).length}명`);
