const fs = require('fs');

console.log('--- [Step 1] Loading Dashboard.jsx ---');
const content = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

const startTag = '{/* ─── Bar Chart (왼쪽 2/3) ─── */}';
const endTag = '{/* ─── Donut Chart (오른쪽 1/3) ─── */}';

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);

if (startIndex === -1 || endIndex === -1) {
    console.error('ERROR: Could not find start or end tags.');
    process.exit(1);
}

const targetStart = content.lastIndexOf('\n', startIndex) + 1;
const targetEnd = content.lastIndexOf('\n', endIndex) + 1;

console.log('\n--- [Step 2] Identifying Deletion Target Range ---');
console.log('Target Start Index:', targetStart);
console.log('Target End Index:', targetEnd);
console.log('\n--- First 150 chars of deletion block ---');
console.log(content.substring(targetStart, targetStart + 150));
console.log('\n--- Last 150 chars of deletion block ---');
console.log(content.substring(targetEnd - 150, targetEnd));

const replacement = `                {/* ─── 하단 Chart Boards (컴포넌트 분리됨) ─── */}
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

const newContent = content.substring(0, targetStart) + replacement + content.substring(targetEnd);

console.log('\n--- [Step 3] Backing up original to Dashboard.jsx.bak ---');
fs.copyFileSync('src/pages/Dashboard.jsx', 'src/pages/Dashboard.jsx.bak');

console.log('--- [Step 4] Writing preview to Dashboard.preview.jsx ---');
fs.writeFileSync('src/pages/Dashboard.preview.jsx', newContent);

console.log('\nAll steps completed successfully. Ready for verification.');
