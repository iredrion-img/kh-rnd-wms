import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ISO 월요일 계산 헬퍼 함수
function getWeekStartStr(dateStr) {
    if (!dateStr) {
        const d = new Date();
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setHours(0,0,0,0);
        d.setDate(d.getDate() + diff);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    // 입력된 텍스트 정제 (예: "2026.05.11" -> "2026-05-11")
    let cleanStr = String(dateStr).trim().replace(/\./g, '-');
    const d = new Date(cleanStr);
    if (isNaN(d)) {
        return getWeekStartStr(); // 파싱 불가 시 이번 주 월요일로 대체
    }
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() + diff);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// 다양한 열 헤더 이름에 유연하게 대응하는 키 찾기 헬퍼
function findKey(row, possibleKeys) {
    const keys = Object.keys(row);
    for (const pk of possibleKeys) {
        const found = keys.find(k => k.replace(/\s+/g, '').toLowerCase().includes(pk));
        if (found) return row[found];
    }
    return '';
}

// 부서명 표준화 헬퍼
function normalizeTeam(raw) {
    if (!raw) return '공통업무&행정';
    const t = String(raw).replace(/\s+/g, '');
    if (t.includes('스마트')) return '스마트 기술 개발팀';
    if (t.includes('디지털')) return '디지털 기술 연구팀';
    if (t.includes('인프라') || t.includes('BIM') || t.includes('bim')) return '인프라 BIM팀';
    if (t.includes('AI') || t.includes('ai') || t.includes('응용')) return 'AI 응용팀';
    if (t.includes('연구과제')) return '연구과제';
    if (t.includes('공지')) return '공지사항';
    return '공통업무&행정';
}

async function run() {
    const args = process.argv.slice(2);
    const targetExcel = args[0] || '2026년 주간공정회의.xlsx';
    const filePath = path.resolve(__dirname, targetExcel);

    console.log(`==================================================`);
    console.log(` KH WMS - 엑셀 주간공정회의 자동 이전 스크립트`);
    console.log(`==================================================`);
    console.log(`[1] 엑셀 파일 로드 시도: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.error(`❌ 오류: 엑셀 파일을 찾을 수 없습니다.`);
        console.error(`서버 PC의 폴더 내에 '${targetExcel}' 파일이 정확히 위치해 있는지 확인해주세요.`);
        console.error(`사용법: node migrate_excel.js [파일명.xlsx]`);
        process.exit(1);
    }

    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        console.log(`[2] 시트 파싱 중... (시트명: "${sheetName}")`);
        
        // 엑셀 시트를 JSON 배열로 파싱
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
        console.log(`총 ${rows.length}개의 행(Row) 데이터를 발견했습니다.`);

        if (rows.length === 0) {
            console.log(`내용이 비어있습니다. 이전을 종료합니다.`);
            return;
        }

        // 기존 대상 JSON 파일 로드
        const targetYear = '2026';
        const targetJsonPath = path.join(__dirname, `weekly_tasks_${targetYear}.json`);
        let existingTasks = [];
        if (fs.existsSync(targetJsonPath)) {
            try { existingTasks = JSON.parse(fs.readFileSync(targetJsonPath, 'utf8')); } catch(e){}
        }

        console.log(`기존 WMS DB (${path.basename(targetJsonPath)})에 ${existingTasks.length}개의 안건이 존재합니다.`);

        let newCount = 0;
        let mergedCount = 0;

        rows.forEach((row) => {
            // 유연한 컬럼 매핑 (구글 시트의 열 이름이 조금씩 달라도 스마트하게 찾아냄)
            const content = findKey(row, ['주요내용', '내용', '안건', 'content', '업무내용', '회의내용']);
            if (!content || String(content).trim() === '') {
                // 주요내용이 비어있으면 빈 줄이나 병합된 헤더일 확률이 높으므로 스킵
                return;
            }

            const rawTeam = findKey(row, ['부서', '팀', '부서명', 'team', '소속', '부문']);
            const team = normalizeTeam(rawTeam);
            
            const assignees = findKey(row, ['담당자', '성명', '이름', '담당', 'assignee']);
            const startDateRaw = findKey(row, ['시작일', '일자', '날짜', '등록일', 'date', 'start']);
            const endDateRaw = findKey(row, ['종료일', '완료일', 'end']);
            const statusRaw = findKey(row, ['상태', '진행상황', 'status']);
            const priorityRaw = findKey(row, ['중요도', '우선순위', 'priority']);
            const resultRaw = findKey(row, ['회의결과', '결과', '조치', 'result']);
            const noteRaw = findKey(row, ['비고', '참고', 'note']);
            const categoryRaw = findKey(row, ['대분류', '구분', 'category']);

            // 날짜를 기반으로 속한 주차(월요일) 자동 계산
            const weekStart = getWeekStartStr(startDateRaw);
            const now = new Date().toISOString().slice(0, 10);

            // 중복 방지 로직: 동일 주차, 동일 부서에 완전히 같은 내용이 이미 존재하는지 검사
            const isDup = existingTasks.some(t => 
                t.week_start === weekStart && 
                t.team === team && 
                t.content.replace(/\s+/g, '') === String(content).replace(/\s+/g, '')
            );

            if (!isDup) {
                const newTask = {
                    id: Date.now().toString() + '-' + Math.floor(Math.random() * 10000),
                    team,
                    category: String(categoryRaw).trim(),
                    sub_category: '',
                    task_code: '',
                    content: String(content).trim(),
                    assignees: String(assignees).trim(),
                    status: String(statusRaw).trim() || '진행 중',
                    priority: String(priorityRaw).trim() || '중간',
                    start_date: String(startDateRaw).trim() || weekStart,
                    end_date: String(endDateRaw).trim() || '',
                    meeting_result: String(resultRaw).trim(),
                    note: String(noteRaw).trim(),
                    week_start: weekStart,
                    created_at: now
                };
                existingTasks.push(newTask);
                newCount++;
            } else {
                mergedCount++;
            }
        });

        // 최종 JSON 파일 업데이트 (원자적 저장 방식)
        fs.writeFileSync(targetJsonPath, JSON.stringify(existingTasks, null, 2), 'utf8');
        
        console.log(`==================================================`);
        console.log(`✨ 마이그레이션 완료!`);
        console.log(` - 성공적으로 신규 적재된 안건: ${newCount}건`);
        console.log(` - 중복으로 병합/스킵된 안건: ${mergedCount}건`);
        console.log(` - 최종 누적 DB 데이터 수: ${existingTasks.length}건`);
        console.log(`==================================================`);
        console.log(`서버 PC 브라우저에서 사이트를 새로고침하시면 완벽히 연동된 안건들을 바로 보실 수 있습니다.`);

    } catch (e) {
        console.error(`❌ 엑셀 파일 읽기/변환 중 예상치 못한 오류가 발생했습니다:`, e);
    }
}

run();
