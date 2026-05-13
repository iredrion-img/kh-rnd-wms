---
name: Bug Report
about: 결함 및 수정 사항 보고를 위한 이슈 템플릿
title: "[fix] "
labels: ["bug"]
assignees: ""
---

## 버그 요약 / Bug Summary

> 문제를 한 줄로 요약하세요.

---

## 현재 동작 / Current Behavior

---

## 기대 동작 / Expected Behavior

---

## 재현 방법 / Reproduction Steps

1.
2.
3.
4. -> 오류 발생

---

## 영향 환경 / Affected Environment

- 접속 URL: http://localhost:3001 / Ngrok 외부 URL
- 브라우저: Chrome / Edge / 기타
- 사용자 계정: (이름 또는 소속 정도만)
- 데이터 파일: database_2026.csv 관련 여부

---

## 의심 영역 / Suspected Area

- [ ] src/pages/Login.jsx
- [ ] src/pages/Dashboard.jsx
- [ ] src/pages/Timesheet.jsx
- [ ] src/pages/WeeklyMeeting.jsx
- [ ] src/components/chat/
- [ ] server.js
- [ ] ragService.js
- [ ] server/ai/aiOrchestrator.js
- [ ] database_2026.csv / users.csv
- [ ] 기타:

---

## 스크린샷 / Screenshots or Logs

```
(로그 붙여넣기)
```

---

## 심각도 / Severity

- [ ] Critical -- 시스템 전체 동작 불가
- [ ] High -- 주요 기능 동작 불가
- [ ] Medium -- 일부 기능 이상, 우회 가능
- [ ] Low -- 미관적 문제 또는 사소한 오류

---

브랜치명 예시:
fix/login-session
fix/csv-data-parsing
fix/chatbot-response-error