const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const CIRCULATION_JSON = path.join(ROOT_DIR, 'circulation_data.json');

// 정교한 CSV 파서 (쌍따옴표 내 콤마 무시, 타입 변환 처리)
function parseCsv(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        const text = lines[i];
        const row = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < text.length; j++) {
            const char = text[j];
            if (char === '"') {
                if (inQuotes && text[j+1] === '"') {
                    current += '"';
                    j++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                row.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        row.push(current);
        
        const obj = {};
        headers.forEach((header, index) => {
            let val = row[index] !== undefined ? row[index] : '';
            val = val.trim();
            // 타입 복원 로직
            if (val === 'true') val = true;
            else if (val === 'false') val = false;
            else if (!isNaN(val) && val !== '') val = Number(val);
            
            obj[header] = val;
        });
        result.push(obj);
    }
    return result;
}

function recoverData() {
    console.log('🔄 [복구 시작] CSV 파일들을 읽어 circulation_data.json을 최신화합니다.');

    // 1. 기존 JSON 읽기 (surveyInfo 등 비배열 데이터 보존용)
    let baseData = {};
    if (fs.existsSync(CIRCULATION_JSON)) {
        baseData = JSON.parse(fs.readFileSync(CIRCULATION_JSON, 'utf8'));
        console.log('✅ 기존 circulation_data.json 구조를 불러왔습니다.');
    } else {
        console.log('⚠️ 기존 json이 없어 빈 객체에서 시작합니다.');
    }

    // 2. CSV 파일 찾기
    const files = fs.readdirSync(ROOT_DIR);
    const csvFiles = files.filter(f => f.startsWith('circulation_data_') && f.endsWith('.csv'));

    if (csvFiles.length === 0) {
        console.log('❌ 복구할 CSV 파일을 찾을 수 없습니다.');
        return;
    }

    // 3. CSV 읽어서 덮어쓰기
    csvFiles.forEach(file => {
        const key = file.replace('circulation_data_', '').replace('.csv', '');
        const content = fs.readFileSync(path.join(ROOT_DIR, file), 'utf8');
        
        // UTF-8 BOM 제거
        const cleanContent = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
        
        const parsedArray = parseCsv(cleanContent);
        baseData[key] = parsedArray;
        
        console.log(`✅ [${key}] 데이터 복구 완료: ${parsedArray.length}건`);
    });

    // 4. 저장
    fs.writeFileSync(CIRCULATION_JSON, JSON.stringify(baseData, null, 2), 'utf8');
    console.log('\n🎉 모든 복구가 성공적으로 완료되었습니다! 서버를 재시작해주세요.');
}

recoverData();
