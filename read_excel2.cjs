const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/KH_WMS/2026년 주간공정회의.xlsx');

// 프로젝트 추진 및 수행 현황 탭 집중 분석
const targetSheets = ['프로젝트 추진 및 수행 현황', '03_주간공정회의'];
wb.SheetNames.forEach(name => {
  if (targetSheets.some(t => name.includes(t.substring(0, 5)) || name === t)) {
    const ws = wb.Sheets[name];
    const range = ws['!ref'] || 'N/A';
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    console.log('시트: [' + name + '] | 범위: ' + range);
    data.slice(0, 15).forEach((row, i) => {
      if (row.some(c => c !== '')) {
        console.log('행' + (i+1) + ': ' + JSON.stringify(row.slice(0, 20)));
      }
    });
    console.log('---');
  }
});

// 모든 시트명 출력
console.log('\n전체 시트 목록:');
wb.SheetNames.forEach((n, i) => console.log(i+1 + '. ' + n));
