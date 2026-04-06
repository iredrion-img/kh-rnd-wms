# KH-WMS GitHub Collaboration Guide

> 이 문서는 KH R&D WMS 프로젝트의 2인 협업 워크플로우를 정의합니다.
> This document defines the 2-person collaboration workflow for the KH R&D WMS project.

---

## 1. Purpose

이 가이드는 리드 개발자와 신규 팀원이 혼선 없이 기능을 분담하고, Pull Request 기반으로 안전하게 병합하기 위한 실용적인 규칙 모음입니다.

---

## 2. Team Roles & Responsibilities

| Role | GitHub ID | Responsibilities |
|------|-----------|-----------------|
| **Lead Developer** | `iredrion-img` | Repository owner · Architecture & shared core review · Final merge authority · Release / stable branch control · Code review & workflow governance |
| **Team Member** | `hooooni46-cell` | Weekly meeting feature development · Chatbot "Hana" feature development · PR-based collaboration · Issue-based task execution · Follows branch, commit, and review rules |

---

## 3. Branch Strategy

```
main          <- 보호된 배포용 브랜치 (protected, no direct push)
  L develop   <- 통합 브랜치 (integration)
       |- feature/weekly-meeting      <- 주간 회의 기능
       |- feature/hana-chatbot        <- 하나 챗봇 기능
       |- feature/weekly-meeting-ui   <- 주간 회의 UI 세부 작업
       |- feature/hana-api            <- 하나 API 연동
       |- fix/login-session           <- 버그 수정
       L  docs/collaboration-guide    <- 문서 작업
```

| Branch | Purpose | Who pushes |
|--------|---------|-----------|
| `main` | 배포 기준 브랜치 | Lead only (via PR from develop) |
| `develop` | 모든 기능의 통합 브랜치 | Lead & Team Member (via PR) |
| `feature/*` | 신규 기능 개발 | Team Member (PR -> develop) |
| `fix/*` | 버그 수정 | Team Member or Lead (PR -> develop) |
| `docs/*` | 문서 업데이트 | Either (PR -> develop) |

---

## 4. Branch Naming Rules

```
feature/<feature-name>      # 신규 기능
fix/<issue-description>     # 버그 수정
docs/<doc-topic>            # 문서 작업
```

Good examples:
```
feature/weekly-meeting
feature/hana-chatbot
feature/weekly-meeting-ui
feature/hana-api
fix/login-session
fix/csv-data-parsing
docs/collaboration-guide
```

Avoid: my-branch / test123 / update / hotfix (too vague)

---

## 5. Commit Convention

Format: `<type>: <short description>`

| Type | When to use |
|------|------------|
| `feat` | 새 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서 변경 |
| `refactor` | 기능 변경 없는 코드 개선 |
| `chore` | 빌드 설정, 패키지 업데이트 등 |
| `style` | UI/CSS 변경 (로직 변경 없음) |

Examples:
```
feat: add weekly meeting registration page
feat: connect hana chatbot response api
fix: resolve login session timeout issue
docs: add github collaboration guide
refactor: extract meeting form into shared component
```

---

## 6. Pull Request Rules

- feature/*, fix/*, docs/* 브랜치에서 작업 완료 후 develop으로 PR
- 절대 main으로 직접 PR 금지 (Lead only)

### PR Checklist
- [ ] 브랜치명이 컨벤션을 따르는가?
- [ ] 커밋 메시지가 컨벤션을 따르는가?
- [ ] 로컬에서 node server.js 동작 확인했는가?
- [ ] 관련 이슈 번호를 PR 설명에 포함했는가?
- [ ] 최신 develop을 반영했는가? (git pull origin develop)
- [ ] 불필요한 파일은 커밋에서 제외했는가?

### PR Title Format
```
[feat] Add weekly meeting registration page
[fix] Resolve login session timeout
[docs] Add collaboration guide
```

---

## 7. Code Review Rules

| Rule | Detail |
|------|--------|
| 리뷰어 | 모든 PR은 iredrion-img가 리뷰 |
| 응답 시간 | 리뷰 요청 후 최대 2 영업일 이내 |
| 머지 권한 | iredrion-img만 Merge 버튼 클릭 가능 |
| Shared core 변경 | server.js, ragService.js, server/ai/, src/services/ 변경은 더 엄격하게 검토 |
| 기능 전용 파일 변경 | src/pages/WeeklyMeeting.jsx, src/components/chat/ 등은 일반 리뷰 |

Comments:
- MUST   -- 머지 전 반드시 수정
- SHOULD -- 권장 수정, 협의 후 결정
- NIT    -- 사소한 스타일, 선택 사항

---

## 8. Merge Rules

- Squash and Merge 권장: feature 브랜치의 WIP 커밋을 하나로 정리
- Merge Commit 허용: 주요 기능 완성 시 히스토리 보존 목적
- Rebase Merge 금지: 충돌 위험 높음
- develop -> main 병합은 iredrion-img가 단독 수행

---

## 9. Weekly Operating Routine

| 시점 | 활동 |
|------|------|
| **매주 월요일** | 이번 주 작업 이슈 생성 및 브랜치 시작 |
| **작업 중** | 커밋 단위로 자주 push, 작업 완료 시 PR 생성 |
| **PR 생성 후** | 리드에게 리뷰 요청 알림 |
| **리뷰 완료** | iredrion-img가 Approve 및 Merge |
| **매주 금요일** | 진행 상황 정리 및 다음 주 작업 사전 논의 |

---

## 10. Area Ownership (CODEOWNERS 기준)

| 경로 | 담당 |
|------|------|
| src/pages/WeeklyMeeting.jsx | hooooni46-cell (primary) |
| src/components/chat/ | hooooni46-cell (primary) |
| server/ai/ | hooooni46-cell (primary, Lead review required) |
| src/pages/Dashboard.jsx | iredrion-img |
| src/pages/Timesheet.jsx | iredrion-img |
| server.js, ragService.js | iredrion-img (strict review) |
| server/dataPipeline/ | iredrion-img |
| server/rag/ | iredrion-img |
| src/utils/, src/services/ | iredrion-img (shared core) |
| database_2026.csv, users.csv | iredrion-img |
| .github/, package.json | iredrion-img |

---

## 11. Prohibited Actions

| 금지 사항 |
|-----------|
| main 브랜치에 직접 push |
| develop 브랜치에 리뷰 없이 직접 merge |
| database_2026.csv 또는 users.csv를 PR 없이 업데이트 |
| server.js, ragService.js 단독 수정 후 push |
| .bak 파일, 디버그 로그, 임시 파일 커밋 |
| 브랜치명/커밋 메시지 컨벤션 미준수 |
| 리뷰 없이 자기 PR self-merge |

---

## 12. Practical Examples

팀원이 주간 회의 기능을 개발하는 경우:
```bash
git checkout develop
git pull origin develop
git checkout -b feature/weekly-meeting

git add src/pages/WeeklyMeeting.jsx
git commit -m "feat: add weekly meeting registration page"
git push origin feature/weekly-meeting

# GitHub에서 PR 생성: feature/weekly-meeting -> develop
# PR 제목: [feat] Add weekly meeting registration page
```

팀원이 Hana 챗봇 API를 연동하는 경우:
```bash
git checkout develop
git pull origin develop
git checkout -b feature/hana-api

git add server/ai/aiOrchestrator.js src/components/chat/
git commit -m "feat: connect hana chatbot response api"
git push origin feature/hana-api
```

---

Last updated: 2026-04-06 | Maintainer: iredrion-img