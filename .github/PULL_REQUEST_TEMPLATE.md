## 📋 PR 목적 / Purpose

> 이 PR이 무엇을 하는지 한 줄로 요약하세요.
> _Summarize what this PR does in one line._

---

## 📝 변경 사항 요약 / Summary of Changes

- 
- 
- 

---

## 🧪 테스트 수행 내역 / Tests Performed

- [ ] 로컬 환경에서 `node server.js` 서버 정상 실행 확인
- [ ] 브라우저에서 해당 기능 동작 확인 (`http://localhost:3001`)
- [ ] `npm run build` 빌드 오류 없음 확인
- [ ] 기존 기능(Dashboard, Timesheet, Login)에 영향 없음 확인

> 추가 테스트 내역이 있으면 기재하세요:

---

## 📁 변경된 파일 / Files Changed

| 파일 경로 | 변경 유형 | 설명 |
|-----------|----------|------|
| `src/pages/...` | 추가 / 수정 / 삭제 | |
| `server/ai/...` | 추가 / 수정 / 삭제 | |

---

## 👀 리뷰 포인트 / Review Focus

> 리뷰어가 특히 주의 깊게 봐야 할 부분을 알려주세요.

- 

---

## 🔗 관련 이슈 / Related Issue

Closes #

---

## 📸 스크린샷 / Screenshots (UI 변경 시 필수)

| Before | After |
|--------|-------|
| | |

---

## 🚨 머지 전 체크리스트 / Pre-Merge Checklist

- [ ] 브랜치명이 컨벤션을 따름 (`feature/*`, `fix/*`, `docs/*`)
- [ ] 커밋 메시지가 컨벤션을 따름 (`feat:`, `fix:`, `docs:` 등)
- [ ] PR 타겟 브랜치가 `develop`임 (절대 `main`이 아님)
- [ ] 최신 `develop`을 이 브랜치에 반영함 (`git pull origin develop`)
- [ ] 불필요한 파일 미포함 (`.bak`, 임시 로그, 테스트용 csv 등)
- [ ] `database_2026.csv`, `users.csv` 변경 시 Lead에게 별도 안내함
- [ ] `server.js` 또는 `ragService.js` 변경 시 Lead에게 별도 안내함
- [ ] Self-merge 하지 않음 — Lead의 Approve 후 Lead가 머지
