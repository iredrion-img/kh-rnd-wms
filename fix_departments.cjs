/**
 * fix_departments.cjs
 * 서버 컴퓨터에서 실행: node fix_departments.cjs
 *
 * users.json의 부서명을 서버 코드가 인식하는 형태(공백 포함)로 수정합니다.
 */

const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, 'users.json');

// DB 저장값(공백 없음) → 서버 코드 매칭값(공백 있음) 변환 맵
const DEPT_MAP = {
  'R&D센터':        'R&D센터',
  '기술연구소':      '기술연구소',
  '스마트기술개발팀': '스마트 기술 개발팀',
  '디지털기술연구팀': '디지털 기술 연구팀',
  '인프라BIM팀':     '인프라 BIM팀',
  'AI응용팀':        'AI 응용팀',
};

const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));

const updated = users.map(u => ({
  ...u,
  department: DEPT_MAP[u.department] || u.department,
}));

// 백업 후 저장
const backupPath = USERS_FILE.replace('.json', `_backup_deptfix_${Date.now()}.json`);
fs.copyFileSync(USERS_FILE, backupPath);
console.log('백업 완료:', backupPath);

fs.writeFileSync(USERS_FILE, JSON.stringify(updated, null, 2), 'utf8');

console.log('\n=== 부서명 수정 결과 ===');
updated.forEach(u => console.log(` - ${u.name} | ${u.department} | ${u.role}`));
console.log('\n✅ 완료! WMS 서버를 재시작해 주세요.');
