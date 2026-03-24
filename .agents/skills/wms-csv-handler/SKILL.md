---
name: wms-csv-handler
description: KH_RnD 프로젝트의 데이터베이스(database_2026.csv) 및 사용자(users.csv) 파일을 읽고 쓰는 백엔드 로직 작성 스킬.
---
# WMS CSV Handler Skill

이 스킬은 `KH_RnD` WMS 시스템의 Node.js 백엔드(`server.js` 또는 `dataPipeline` 서비스)에서 CSV 데이터를 처리하거나 관련 서버 라우트 오류를 디버깅할 때 사용합니다.

## 백엔드/데이터 파일 규칙 (Backend Rules)
1. **파일 읽기 무결성 보장**: CSV를 읽을 때는 항상 `server.js`에 정의된 `readCsvResilient(filePath)`와 같이, 빈 파일이나 BOM 문자, 깨진 포맷에서 시스템이 다운되지 않도록 예외 처리된 파서를 사용합니다.
2. **원자적 쓰기 (Atomic Write)**: 동시성 쓰기 충돌이나 기록 중 서버 크래시로 인한 데이터 유실을 막기 위해, 임시 파일(`.tmp`)에 전체 데이터를 기록 후 `fs.renameSync`를 덮어씌워서 쓰는 원자적 패턴(`writeAtomic` 등)을 엄수하세요. 잦은 `fs.appendFileSync`는 지양합니다.
3. **글로벌 에러 핸들링**: 백엔드가 크래시(`node server.js` 강제 종료)되어 프론트엔드 대시보드가 먹통이 되는 일이 없도록, 모든 비동기 / 라우트 핸들러의 최고 레벨에 `try...catch` 블록을 구성하세요.
4. **절대/상대 경로**: 디렉토리와 파일 경로는 반드시 `path.join(__dirname, '파일')` 형식의 동적 스크립트 실행 환경을 고려한 절대 경로 조립 방식을 채택합니다.
