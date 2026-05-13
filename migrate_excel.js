import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 엑셀 날짜(시리얼 번호 또는 문자열)를 표준 YYYY-MM-DD로 변환
function serialToDate(serial) {
  if (!serial) return '';
  // 문자열 형태의 날짜인 경우 (예: "26. 03. 03" -> "2026-03-03")
  if (typeof serial === 'string') {
    let s = serial.replace(/\s+/g, '').trim();
    let parts = s.split('.');
    if (parts.length >= 3) {
      let y = parts[0];
      if (y.length === 2) y = "20" + y;
      return `${y}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    return serial.trim();
  }
  if (isNaN(serial)) return '';
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return date.toISOString().slice(0, 10);
}

// 해당 날짜가 속한 주차의 월요일 날짜 계산
function getWeekStart(dateStr) {
  if (!dateStr) return '2026-05-11';
  const d = new Date(dateStr);
  if (isNaN(d)) {
    return '2026-05-11'; // 기본값으로 2026년 5월 11일 주차 배정
  }
  const day = d.getDay(); // 0=일, 1=월
  const diff = day === 0 ? -6 : 1 - day;
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + diff);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

async function run() {
  // 실제 파일이 존재할 수 있는 모든 후보 경로를 지능적으로 탐색
  const candidates = [
    process.argv[2],
    'C:/KH_WMS/2026년 주간공정회의.xlsx',
    path.join(__dirname, '2026년 주간공정회의.xlsx'),
    path.join(__dirname, 'wms_data.xlsx')
  ].filter(Boolean);

  let targetPath = null;
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      targetPath = c;
      break;
    }
  }

  console.log(`==================================================`);
  console.log(` KH WMS - 엑셀 주간공정회의 완벽 이전 스크립트`);
  console.log(`==================================================`);
  
  if (!targetPath) {
    console.error(`❌ 오류: 엑셀 파일을 찾을 수 없습니다.`);
    console.error(`탐색한 경로 목록:\n - ${candidates.join('\n - ')}`);
    process.exit(1);
  }

  console.log(`[1] 엑셀 파일 로드 성공: ${targetPath}`);
  const wb = xlsx.readFile(targetPath);

  // 이관 대상 6개 팀 정의
  const TASK_SHEETS = [
    { sheetName: '공통업무&행정',          team: '공통업무&행정' },
    { sheetName: '스마트 기술 개발팀',     team: '스마트 기술 개발팀' },
    { sheetName: '디지털 기술 연구팀',     team: '디지털 기술 연구팀' },
    { sheetName: '인프라 BIM팀',           team: '인프라 BIM팀' },
    { sheetName: 'AI 응용팀',              team: 'AI 응용팀' },
    { sheetName: '연구과제',               team: '연구과제' },
  ];

  const targetYear = '2026';
  const targetJsonPath = path.join(__dirname, `weekly_tasks_${targetYear}.json`);
  let tasks = [];

  let idCounter = Date.now();
  const now = new Date().toISOString().slice(0, 10);
  let totalCount = 0;

  TASK_SHEETS.forEach(({ sheetName, team }) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) { 
      console.warn(`⚠️ [${team}] 엑셀 시트를 찾을 수 없어 건너뜁니다.`); 
      return; 
    }

    // header: 1 옵션으로 실제 열(Column) 인덱스를 정확히 매핑
    const raw = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const dataRows = raw.slice(1); // 첫 줄(헤더) 제외
    let sheetCount = 0;

    dataRows.forEach(row => {
      if (!row || row.every(c => c === '' || c === null)) return;

      const category   = String(row[0] || '').trim();
      const subCat     = String(row[1] || '').trim().replace(/^\s+$/, '');
      const taskCode   = String(row[3] || '').trim();
      const content    = String(row[4] || '').trim();
      const assignees  = String(row[5] || '').trim();
      const status     = String(row[6] || '').trim() || '진행 중';
      const priority   = String(row[7] || '').trim() || '중간';
      const startDate  = serialToDate(row[8]);
      const endDate    = serialToDate(row[9]);
      const meetResult = String(row[10] || '').trim();
      const note       = String(row[11] || '').trim();

      // 주요내용과 과제코드가 모두 없으면 단순 빈 줄이므로 스킵
      if (!content && !taskCode) return;

      // 시작일이 없으면 최근 기준일 배정
      const cleanStartDate = startDate || '2026-05-11';
      const weekStart = getWeekStart(cleanStartDate);
      const id = String(idCounter++);

      tasks.push({
        id,
        team,
        category,
        sub_category: subCat,
        task_code: taskCode,
        content: content || taskCode, // 주요내용이 비어있으면 과제코드로 대체
        assignees,
        status,
        priority,
        start_date: cleanStartDate,
        end_date: endDate,
        meeting_result: meetResult,
        note,
        week_start: weekStart,
        created_at: now
      });
      sheetCount++;
      totalCount++;
    });

    console.log(`✅ [${team}] 데이터 추출 완료: ${sheetCount}건`);
  });

  // 최종 JSON 파일 원자적 덮어쓰기 저장
  fs.writeFileSync(targetJsonPath, JSON.stringify(tasks, null, 2), 'utf8');
  console.log(`==================================================`);
  console.log(`✨ 전체 안건 JSON 데이터베이스 구축 완료!`);
  console.log(` - 저장 파일: ${path.basename(targetJsonPath)}`);
  console.log(` - 총 연동된 안건 수: ${tasks.length}건`);
  console.log(`==================================================`);
  console.log(`이제 브라우저에서 새로고침을 하시면 모든 팀의 주간공정회의 안건이 완벽하게 나타납니다.`);
}

run();
