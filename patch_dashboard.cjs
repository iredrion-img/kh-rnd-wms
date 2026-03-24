// patch_dashboard.js
const fs = require('fs');

const targetPath = 'src/pages/Dashboard.preview.jsx';
let code = fs.readFileSync(targetPath, 'utf8');

// 1. imports 보정 (아직 없으면 상단에 추가)
if (!code.includes('import WeeklyChartBoard')) {
    code = code.replace(
        "import { CATEGORIES", 
        "import WeeklyChartBoard from '../components/dashboard/WeeklyChartBoard';\nimport MonthlyChartBoard from '../components/dashboard/MonthlyChartBoard';\nimport YearlyChartBoard from '../components/dashboard/YearlyChartBoard';\nimport { CATEGORIES"
    );
}

// 2. isDisplayBoardMode 강제 플래그 보정 (false로)
code = code.replace(
    "const isDisplayBoardMode = true;", 
    "const isDisplayBoardMode = false;"
);

// 3. 기존 인라인 렌더링 charts section (min-h-0 포함 여부와 무관하게) 시작점 탐색
let startIdx = code.indexOf('<section className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3');
if (startIdx === -1) {
    startIdx = code.indexOf('<section className="flex-1 grid grid-cols-1 lg:grid-cols-3');
}

// 4. 교체할 블록의 끝점(Donut Chart 직전) 탐색
const donutMarker = '{/* ─── Donut Chart (오른쪽 1/3) ─── */}';
let endIdx = code.indexOf(donutMarker, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    // 5. 들어갈 새 컴포넌트 JSX 블록 (승인된 최종안, 추가 wrapper 완전 제거)
    const newSection = `<section className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-[clamp(0.5rem,1vw,1.5rem)]">

                {/* ─── 하단 Chart Boards (컴포넌트 분리됨) ─── */}
                {timeRange === 'weekly' && (
                    <WeeklyChartBoard 
                        key={\`\${currentDate.toISOString()}-weekly\`}
                        data={processedData.areaChartData}
                        totalHours={processedData.totalHours}
                        isDisplayBoardMode={isDisplayBoardMode}
                    />
                )}
                {timeRange === 'monthly' && (
                        <MonthlyChartBoard
                            key={\`\${currentDate.toISOString()}-monthly\`}
                            data={processedData.areaChartData}
                            activeViewMode={activeViewMode}
                            setViewMode={setViewMode}
                            isDisplayBoardMode={isDisplayBoardMode}
                        />
                )}
                {timeRange === 'yearly' && (
                        <YearlyChartBoard
                            key={\`\${currentDate.toISOString()}-yearly\`}
                            data={processedData.areaChartData}
                            activeViewMode={activeViewMode}
                            setViewMode={setViewMode}
                            isDisplayBoardMode={isDisplayBoardMode}
                        />
                )}

                `;

    // 6. 지정된 범위 교체 및 파일 저장
    code = code.substring(0, startIdx) + newSection + code.substring(endIdx);
    fs.writeFileSync(targetPath, code);
    console.log('[SUCCESS] Dashboard.preview.jsx가 성공적으로 패치되었습니다.');
    
} else {
    console.log('[ERROR] 패치 블록 인덱스를 찾지 못했습니다.', { startIdx, endIdx });
}
