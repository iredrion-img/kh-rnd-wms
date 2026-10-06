const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const backupDir = path.join(rootDir, '# WMS_data backup');

// 현재 데이터가 우선순위를 가집니다. (중복 시 현재 데이터 유지)

function mergeArrays(current, backup, keyFn) {
  const map = new Map();
  // 1. 백업 데이터 먼저 Map에 추가
  backup.forEach(item => {
    map.set(keyFn(item), item);
  });
  // 2. 현재 데이터 덮어쓰기 (현재 데이터 유지)
  current.forEach(item => {
    map.set(keyFn(item), item);
  });
  return Array.from(map.values());
}

function mergeJSON() {
  const filesToMerge = [
    {
      name: 'database_2026.json',
      merge: (cur, bk) => mergeArrays(cur, bk, item => `${item.employee}_${item.project_name}_${item.week_start}`)
    },
    {
      name: 'weekly_tasks_2026.json',
      merge: (cur, bk) => mergeArrays(cur, bk, item => item.id)
    },
    {
      name: 'weekly_schedule.json',
      merge: (cur, bk) => mergeArrays(cur, bk, item => item.id)
    },
    {
      name: 'projects.json',
      merge: (cur, bk) => mergeArrays(cur, bk, item => item.id || item.project_code)
    },
    {
      name: 'users.json',
      merge: (cur, bk) => mergeArrays(cur, bk, item => item.id || item.name)
    },
    {
      name: 'meeting_overview.json',
      merge: (cur, bk) => mergeArrays(cur, bk, item => item.week)
    },
    {
      name: 'circulation_data.json',
      merge: (cur, bk) => {
        return {
          customData: mergeArrays(cur.customData || [], bk.customData || [], item => item.name),
          surveyData: mergeArrays(cur.surveyData || [], bk.surveyData || [], item => item.name),
          vacations: mergeArrays(cur.vacations || [], bk.vacations || [], item => `${item.name}_${item.date}_${item.type}`),
          customForm: { ...(bk.customForm || {}), ...(cur.customForm || {}) }
        };
      }
    }
  ];

  filesToMerge.forEach(fileInfo => {
    const curPath = path.join(rootDir, fileInfo.name);
    const bkPath = path.join(backupDir, fileInfo.name);

    if (fs.existsSync(bkPath)) {
      try {
        let curData = [];
        if (fs.existsSync(curPath)) {
          curData = JSON.parse(fs.readFileSync(curPath, 'utf8'));
        }
        const bkData = JSON.parse(fs.readFileSync(bkPath, 'utf8'));

        const mergedData = fileInfo.merge(curData, bkData);
        fs.writeFileSync(curPath, JSON.stringify(mergedData, null, 2), 'utf8');
        console.log(`[성공] ${fileInfo.name} 병합 완료 (총 ${Array.isArray(mergedData) ? mergedData.length : '객체'}건)`);
      } catch (err) {
        console.error(`[오류] ${fileInfo.name} 병합 중 에러 발생:`, err.message);
      }
    } else {
      console.log(`[알림] 백업 폴더에 ${fileInfo.name} 파일이 없어 건너뜁니다.`);
    }
  });
}

mergeJSON();
