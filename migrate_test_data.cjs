/**
 * migrate_test_data.cjs
 * 엑셀(2026년 주간공정회의.xlsx) → weekly_tasks_2026.csv 이관 스크립트 (2026년 3월 데이터 한정)
 */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = 'C:/KH_WMS/2026년 주간공정회의.xlsx';
const OUT_DIR = path.join(__dirname);

// Excel Serial to YYYY-MM-DD
function serialToDate(serial) {
  if (!serial || isNaN(serial)) return '';
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return date.toISOString().slice(0, 10);
}

// Compute Monday of the week
function getWeekStart(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  const day = d.getDay(); // 0=Sun, 1=Mon
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

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

const TASK_COLUMNS = [
  'id', 'team', 'category', 'sub_category', 'task_code',
  'content', 'assignees', 'status', 'priority',
  'start_date', 'end_date', 'meeting_result', 'note', 'week_start', 'created_at'
];

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
  const dataRows = raw.slice(1);

  dataRows.forEach(row => {
    if (!row || row.every(c => c === '' || c === null)) return;

    const startDate  = serialToDate(row[8]);
    const endDate    = serialToDate(row[9]);
    
    // 2026-03 필터링: 시작일 또는 종료일이 2026년 3월에 속하는 경우에만 처리
    if (!(startDate.startsWith('2026-03') || endDate.startsWith('2026-03'))) {
      return; 
    }

    const category   = String(row[0] || '').trim();
    const subCat     = String(row[1] || '').trim().replace(/^\s+$/, '');
    const taskCode   = String(row[3] || '').trim();
    const content    = String(row[4] || '').trim();
    const assignees  = String(row[5] || '').trim();
    const status     = String(row[6] || '').trim();
    const priority   = String(row[7] || '').trim();
    const meetResult = String(row[10] || '').trim();
    const note       = String(row[11] || '').trim();

    if (!content && !taskCode) return;

    const weekStart = getWeekStart(startDate);
    const id = String(idCounter++).padStart(6, '0');

    const taskRow = [
      id, team, category, subCat, taskCode,
      content, assignees, status, priority,
      startDate, endDate, meetResult, note, weekStart, now
    ];
    taskRows.push(rowToCsv(taskRow));
  });

});

// weekly_tasks_2026.csv 덮어쓰기 완료
const taskFile2026 = path.join(OUT_DIR, 'weekly_tasks_2026.csv');
fs.writeFileSync(taskFile2026, taskRows.join('\n'), 'utf8');
console.log(`\n🎉 2026년 3월 마이그레이션 저장 완료: ${taskFile2026} (${taskRows.length - 1}건)`);
