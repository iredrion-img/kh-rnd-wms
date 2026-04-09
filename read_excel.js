const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/KH_WMS/2026년 주간공정회의.xlsx');

console.log('=== 시트 목록 ===');
wb.SheetNames.forEach((name, i) => {
  console.log((i+1) + '. ' + name);
});

wb.SheetNames.forEach(name => {
  const ws = wb.Sheets[name];
  const range = ws['!ref'] || 'N/A';
  const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
  const data = rawData.filter((row, index) => {
    if (index === 0) return true;
    return row.some(cell => {
      if (typeof cell !== 'string') return false;
      const str = cell.replace(/\s+/g, '');
      return str.includes('26.03.') || str.includes('2026.03') || str.includes('2026-03');
    });
  });
  const maxCols = data.reduce((max, row) => Math.max(max, row.length), 0);
  console.log('\n=== 시트: [' + name + '] | 기존 총 행수: ' + rawData.length + ' | 필터된 행수(26년3월): ' + data.length + ' | 최대 열수: ' + maxCols + ' ===');
  data.slice(0, 10).forEach((row, i) => {
    const filtered = row.slice(0, 20);
    console.log('  행' + (i+1) + ': ' + JSON.stringify(filtered));
  });
});
