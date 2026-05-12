const xlsx = require('xlsx');
const workbook = xlsx.readFile('wms_data.xlsx');
console.log('Sheets:', workbook.SheetNames);
workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    if (data.length > 0) {
        console.log(`Sheet: ${sheetName}, Columns:`, Object.keys(data[0]));
    } else {
        console.log(`Sheet: ${sheetName} is empty.`);
    }
});
