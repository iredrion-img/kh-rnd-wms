/**
 * import_excel.cjs
 * 엑셀(2026년 주간공정회의.xlsx) → weekly_tasks_2026.csv / weekly_tasks_2025.csv 이관 스크립트
 */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = 'C:/KH_WMS/2026년 주간공정회의.xlsx';
const OUT_DIR = path.join(__dirname);

// 엑셀 시리얼 → YYYY-MM-DD 변환
function serialToDate(serial) {
  if (!serial || isNaN(serial)) return '';
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return date.toISOString().slice(0, 10);
}

// 주 시작일(월요일) 계산
function getWeekStart(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  const day = d.getDay(); // 0=일, 1=월
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

// CSV 문자열 이스케이프
function esc(v) {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function rowToCsv(row) {
  return row.map(esc).join(',');
}

const wb = XLSX.readFile(EXCEL_PATH);

// ========================
// 업무 현황 탭 → weekly_tasks
// ========================
const TASK_COLUMNS = [
  'id', 'team', 'category', 'sub_category', 'task_code',
  'content', 'assignees', 'status', 'priority',
  'start_date', 'end_date', 'meeting_result', 'note', 'week_start', 'created_at'
];

// 업무 현황 시트 목록 (team 이름 매핑)
const TASK_SHEETS = [
  { sheetName: '공통업무&행정',          team: '공통업무&행정' },
  { sheetName: '스마트 기술 개발팀',     team: '스마트 기술 개발팀' },
  { sheetName: '디지털 기술 연구팀',     team: '디지털 기술 연구팀' },
  { sheetName: '인프라 BIM팀',           team: '인프라 BIM팀' },
  { sheetName: 'AI 응용팀',              team: 'AI 응용팀' },
  { sheetName: '연구과제',               team: '연구과제' },
];

let taskRows = [TASK_COLUMNS.join(',')];
let idCounter = 1;
const now = new Date().toISOString().slice(0, 10);

TASK_SHEETS.forEach(({ sheetName, team }) => {
  const ws = wb.Sheets[sheetName];
  if (!ws) { console.warn('시트 없음:', sheetName); return; }

  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  // 헤더 행 스킵 (행1)
  const dataRows = raw.slice(1);

  dataRows.forEach(row => {
    // 빈 행 스킵
    if (!row || row.every(c => c === '' || c === null)) return;

    const category   = String(row[0] || '').trim();
    const subCat     = String(row[1] || '').trim().replace(/^\s+$/, ''); // 공백 헤더 정규화
    const taskCode   = String(row[3] || '').trim();
    const content    = String(row[4] || '').trim();
    const assignees  = String(row[5] || '').trim();
    const status     = String(row[6] || '').trim();
    const priority   = String(row[7] || '').trim();
    const startDate  = serialToDate(row[8]);
    const endDate    = serialToDate(row[9]);
    const meetResult = String(row[10] || '').trim();
    const note       = String(row[11] || '').trim(); // 스마트팀 비고

    if (!content && !taskCode) return; // 내용 없는 행 스킵

    const weekStart = getWeekStart(startDate);
    const id = String(idCounter++).padStart(6, '0');

    const taskRow = [
      id, team, category, subCat, taskCode,
      content, assignees, status, priority,
      startDate, endDate, meetResult, note, weekStart, now
    ];
    taskRows.push(rowToCsv(taskRow));
  });

  console.log(`✅ [${sheetName}] → ${TASK_SHEETS.find(s => s.sheetName === sheetName)?.team}: ${dataRows.length}행 처리`);
});

// weekly_tasks_2026.csv 저장
const taskFile2026 = path.join(OUT_DIR, 'weekly_tasks_2026.csv');
fs.writeFileSync(taskFile2026, taskRows.join('\n'), 'utf8');
console.log(`\n📄 저장 완료: ${taskFile2026} (${taskRows.length - 1}건)`);

// ========================
// 주간일정 → weekly_schedule
// ========================
const SCHEDULE_COLUMNS = [
  'id', 'schedule_type', 'content', 'start_date', 'end_date', 'location', 'assignees', 'week_start', 'year', 'created_at'
];

function processScheduleSheet(sheetName, year) {
  const ws = wb.Sheets[sheetName];
  if (!ws) { console.warn('시트 없음:', sheetName); return []; }

  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const rows = [];
  raw.slice(1).forEach(row => {
    if (!row || row.every(c => c === '' || c === null)) return;
    const schedType = String(row[0] || '').trim();
    const content   = String(row[1] || '').trim();
    const startDate = serialToDate(row[2]);
    const endDate   = serialToDate(row[3]);
    const location  = String(row[4] || '').trim();
    const assignees = String(row[5] || '').trim();
    if (!schedType && !content) return;
    const weekStart = getWeekStart(startDate);
    const id = String(idCounter++).padStart(6, '0');
    rows.push([id, schedType, content, startDate, endDate, location, assignees, weekStart, year, now]);
  });
  return rows;
}

const schedRows2026 = processScheduleSheet('주간일정', '2026');
const schedRows2025 = processScheduleSheet('주간일정(25)', '2025');

const schedFile = path.join(OUT_DIR, 'weekly_schedule.csv');
const schedAll = [
  SCHEDULE_COLUMNS.join(','),
  ...[...schedRows2026, ...schedRows2025].map(rowToCsv)
];
fs.writeFileSync(schedFile, schedAll.join('\n'), 'utf8');
console.log(`📄 저장 완료: ${schedFile} (${schedAll.length - 1}건)`);

// ========================
// 프로젝트 추진 현황
// ========================
const PROJECT_COLUMNS = [
  'id', 'category', 'sub_no', 'project_code', 'project_name',
  'method', 'bim_cost', 'dept', 'manager', 'status_detail', 'created_at'
];

const projWs = wb.Sheets['프로젝트 추진 및 수행 현황'];
let projRows = [PROJECT_COLUMNS.join(',')];
if (projWs) {
  const raw = XLSX.utils.sheet_to_json(projWs, { header: 1, defval: '' });
  raw.slice(1).forEach(row => {
    if (!row || row.every(c => c === '' || c === null)) return;
    const id = String(idCounter++).padStart(6, '0');
    const projRow = [
      id,
      String(row[0] || '').trim(),  // 대분류
      String(row[1] || '').trim(),  // 소분류(순번)
      String(row[2] || '').trim(),  // 프로젝트코드
      String(row[3] || '').trim(),  // 프로젝트명
      String(row[4] || '').trim(),  // 수행방식
      String(row[5] || '').trim(),  // BIM 용역비
      String(row[6] || '').trim(),  // 담당부서
      String(row[7] || '').trim(),  // 담당자
      String(row[8] || '').trim(),  // 수행현황
      now
    ];
    projRows.push(rowToCsv(projRow));
  });
}
const projFile = path.join(OUT_DIR, 'projects.csv');
fs.writeFileSync(projFile, projRows.join('\n'), 'utf8');
console.log(`📄 저장 완료: ${projFile} (${projRows.length - 1}건)`);

console.log('\n🎉 데이터 이관 완료!');
console.log('  - weekly_tasks_2026.csv : 업무 현황 (6개 팀)');
console.log('  - weekly_schedule.csv   : 주간 일정 (2025+2026)');
console.log('  - projects.csv          : 프로젝트 추진 현황');
