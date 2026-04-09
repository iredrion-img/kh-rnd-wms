const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/KH_WMS/2026년 주간공정회의.xlsx');

console.log('=== 전체 시트 목록 ===');
wb.SheetNames.forEach((name, i) => console.log((i+1) + '. ' + name));

wb.SheetNames.forEach(name => {
  const ws = wb.Sheets[name];
  const range = ws['!ref'] || 'N/A';
  const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
  // 첫 행(헤더)은 무조건 포함하고, 그 외 행 중에서 '26. 03.' 등의 날짜형식을 포함하는 행만 필터링합니다.
  const data = rawData.filter((row, index) => {
    if (index === 0) return true;
    return row.some(cell => {
      if (typeof cell !== 'string') return false;
      const str = cell.replace(/\s+/g, '');
      return str.includes('26.03.') || str.includes('2026.03') || str.includes('2026-03');
    });
  });
  const maxCols = data.reduce((max, row) => Math.max(max, row.length), 0);

  console.log('\n========================================');
  console.log('시트: [' + name + ']');
  console.log('기존 행수: ' + rawData.length + ' | 필터링된 행수(2026년 3월): ' + data.length);
  console.log('범위: ' + range + ' | 행수: ' + data.length + ' | 열수: ' + maxCols);
  console.log('--- 헤더 (행1) ---');
  if (data[0]) console.log(JSON.stringify(data[0]));
  console.log('--- 샘플 데이터 (행2~4) ---');
  data.slice(1, 4).forEach((row, i) => {
    console.log('행' + (i+2) + ': ' + JSON.stringify(row.slice(0, 20)));
  });
});
