# KH-WMS GitHub 온보딩 가이드 (신규 팀원)

> 환영합니다! 이 문서는 새로운 팀원이 KH-WMS 프로젝트에 처음 참여할 때 가장 먼저 읽어야 하는 가이드입니다.

---

## 1. 사전 준비

다음 도구를 먼저 설치하세요:

- **Node.js** (v18 이상 LTS 권장): https://nodejs.org/
- **Git**: https://git-scm.com/
- **코드 에디터**: VS Code 권장 (https://code.visualstudio.com/)

---

## 2. 저장소 클론

```bash
git clone https://github.com/iredrion-img/kh-rnd-wms.git
cd kh-rnd-wms
```

---

## 3. 의존성 설치 및 개발 서버 실행

```bash
npm install
npm run dev         # 개발 서버 (Vite, http://localhost:5173)
# 또는
node server.js      # 백엔드 서버 (http://localhost:3001)
```

> 보통은 두 터미널을 동시에 열어 `npm run dev`와 `node server.js`를 각각 실행합니다.

---

## 4. 개발 시작 전 — develop 브랜치 최신화

항상 작업 시작 전에 `develop`을 최신 상태로 동기화합니다:

```bash
git checkout develop
git pull origin develop
```

---

## 5. 기능 브랜치 만들기

```bash
# develop 기준으로 새 브랜치 생성
git checkout -b feature/weekly-meeting
# 또는
git checkout -b feature/hana-chatbot
```

브랜치 이름 규칙:
- `feature/<기능명>` — 신규 기능
- `fix/<문제명>` — 버그 수정
- `docs/<문서명>` — 문서 작업

---

## 6. 코드 작성 및 커밋

```bash
# 변경 파일 확인
git status

# 필요한 파일만 스테이징
git add src/pages/WeeklyMeeting.jsx
git add src/components/chat/

# 커밋 (컨벤션 준수!)
git commit -m "feat: add weekly meeting registration form"
```

커밋 메시지 규칙:
- `feat: ` — 새 기능
- `fix: ` — 버그 수정
- `docs: ` — 문서
- `refactor: ` — 리팩터링
- `chore: ` — 설정, 패키지 등

---

## 7. 브랜치 Push

```bash
git push origin feature/weekly-meeting
```

---

## 8. Pull Request 열기

1. GitHub 저장소 페이지(https://github.com/iredrion-img/kh-rnd-wms)에 접속
2. 상단에 뜨는 **"Compare & pull request"** 버튼 클릭
3. **Base branch**: `develop` 확인 (`main`이면 반드시 `develop`으로 변경)
4. PR 템플릿에 맞게 내용 작성
5. **Reviewers** 항목에 `@LEAD_GITHUB_ID` 추가
6. **Submit pull request** 클릭
7. 리드 개발자에게 카카오톡/슬랙 등으로 리뷰 요청 알림

---

## 9. 리뷰 이후 수정

리뷰 코멘트가 달리면:

```bash
# 현재 feature 브랜치에서 수정
git add <수정된 파일>
git commit -m "fix: address review comments"
git push origin feature/weekly-meeting
```

PR에 자동 반영됩니다. 추가로 알릴 필요 없습니다.

---

## 10. develop 최신화 (충돌 예방)

작업 중 develop이 업데이트된 경우:

```bash
git checkout develop
git pull origin develop
git checkout feature/weekly-meeting
git merge develop
# 충돌 해결 후
git push origin feature/weekly-meeting
```

---

## 11. ❌ 절대 하지 말아야 할 것

| 금지 사항 | 이유 |
|-----------|------|
| `git push origin main` | main은 직접 push 불가 (보호됨) |
| `git push origin develop` (직접) | develop도 PR을 통해서만 병합 |
| 리뷰 없이 PR self-merge | Lead만 merge 권한 가짐 |
| `database_2026.csv` 직접 편집 후 push | 데이터 손상 위험, Lead와 반드시 협의 |
| `server.js`, `ragService.js` 단독 수정 | 핵심 서버 로직, Lead 검토 필수 |
| `.bak`, 임시 파일 커밋 | 저장소 오염 |

---

## 12. 자주 하는 실수 (Common Mistakes)

### ❌ base branch를 main으로 설정한 경우
PR 생성 화면에서 base를 **`develop`** 으로 바꾸면 됩니다.

### ❌ develop이 최신이 아닌 상태에서 작업 시작
```bash
git checkout develop && git pull origin develop
```
을 항상 먼저 실행하세요.

### ❌ 너무 많은 변경을 한 커밋에 넣은 경우
커밋은 작고 논리적인 단위로 나누세요. 리뷰가 훨씬 쉬워집니다.

### ❌ 커밋 메시지가 "update", "fix", "asdf" 등
반드시 `feat: `, `fix: ` 등의 prefix를 붙이고 구체적인 내용을 기재하세요.

---

## 13. 참고 자료

- **협업 가이드 전체**: [README_COLLABORATION.md](../README_COLLABORATION.md)
- **GitHub 저장소**: https://github.com/iredrion-img/kh-rnd-wms
- **Git 기초**: https://git-scm.com/book/ko/v2

---

*궁금한 점은 리드 개발자(`@LEAD_GITHUB_ID`)에게 언제든지 물어보세요.*
