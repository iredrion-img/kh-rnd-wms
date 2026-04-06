# KH-WMS GitHub Collaboration Guide

> ??ë¬¸ì„œ??KH R&D WMS ?„ë¡œ?íŠ¸??2???‘ì—… ?Œí¬?Œë¡œ?°ë? ?•ì˜?©ë‹ˆ??  
> This document defines the 2-person collaboration workflow for the KH R&D WMS project.

---

## 1. Purpose

??ê°€?´ë“œ??ë¦¬ë“œ ê°œë°œ?ì? ? ê·œ ?€?ì´ ?¼ì„  ?†ì´ ê¸°ëŠ¥??ë¶„ë‹´?˜ê³ , Pull Request ê¸°ë°˜?¼ë¡œ ?ˆì „?˜ê²Œ ë³‘í•©?˜ê¸° ?„í•œ ?¤ìš©?ì¸ ê·œì¹™ ëª¨ìŒ?…ë‹ˆ??

---

## 2. Team Roles & Responsibilities

| Role | GitHub ID | Responsibilities |
|------|-----------|-----------------|
| **Lead Developer** | `iredrion-img` | Repository owner Â· Architecture & shared core review Â· Final merge authority Â· Release / stable branch control Â· Code review & workflow governance |
| **Team Member** | `hooooni46-cell` | Weekly meeting feature development Â· Chatbot "Hana" feature development Â· PR-based collaboration Â· Issue-based task execution Â· Follows branch, commit, and review rules |

---

## 3. Branch Strategy

```
main          ??ë³´í˜¸??ë°°í¬??ë¸Œëœì¹?(protected, no direct push)
  ?”â? develop  ???µí•© ë¸Œëœì¹?(integration)
       ?œâ? feature/weekly-meeting      ??ì£¼ê°„ ?Œì˜ ê¸°ëŠ¥
       ?œâ? feature/hana-chatbot        ???˜ë‚˜ ì±—ë´‡ ê¸°ëŠ¥
       ?œâ? feature/weekly-meeting-ui   ??ì£¼ê°„ ?Œì˜ UI ?¸ë? ?‘ì—…
       ?œâ? feature/hana-api            ???˜ë‚˜ API ?°ë™
       ?œâ? fix/login-session           ??ë²„ê·¸ ?˜ì •
       ?”â? docs/collaboration-guide    ??ë¬¸ì„œ ?‘ì—…
```

| Branch | Purpose | Who pushes |
|--------|---------|-----------|
| `main` | ë°°í¬ ê¸°ì? ë¸Œëœì¹?| Lead only (via PR from develop) |
| `develop` | ëª¨ë“  ê¸°ëŠ¥???µí•© ë¸Œëœì¹?| Lead & Team Member (via PR) |
| `feature/*` | ? ê·œ ê¸°ëŠ¥ ê°œë°œ | Team Member (PR ??develop) |
| `fix/*` | ë²„ê·¸ ?˜ì • | Team Member or Lead (PR ??develop) |
| `docs/*` | ë¬¸ì„œ ?…ë°?´íŠ¸ | Either (PR ??develop) |

---

## 4. Branch Naming Rules

```
feature/<feature-name>      # ? ê·œ ê¸°ëŠ¥
fix/<issue-description>     # ë²„ê·¸ ?˜ì •
docs/<doc-topic>            # ë¬¸ì„œ ?‘ì—…
```

**Good examples:**
```
feature/weekly-meeting
feature/hana-chatbot
feature/weekly-meeting-ui
feature/hana-api
fix/login-session
fix/csv-data-parsing
docs/collaboration-guide
docs/api-specification
```

**Avoid:**
```
my-branch
test123
update
hotfix    ??too vague, use fix/<description>
```

---

## 5. Commit Convention

Format: `<type>: <short description in English or Korean>`

| Type | When to use |
|------|------------|
| `feat` | ??ê¸°ëŠ¥ ì¶”ê? |
| `fix` | ë²„ê·¸ ?˜ì • |
| `docs` | ë¬¸ì„œ ë³€ê²?|
| `refactor` | ê¸°ëŠ¥ ë³€ê²??†ëŠ” ì½”ë“œ ê°œì„  |
| `chore` | ë¹Œë“œ ?¤ì •, ?¨í‚¤ì§€ ?…ë°?´íŠ¸ ??|
| `style` | UI/CSS ë³€ê²?(ë¡œì§ ë³€ê²??†ìŒ) |

**Examples:**
```
feat: add weekly meeting registration page
feat: connect hana chatbot response api
feat: add meeting history list view
fix: resolve login session timeout issue
fix: csv data parsing error on empty rows
docs: add github collaboration guide
refactor: extract meeting form into shared component
chore: update package.json dependencies
style: adjust chatbot modal responsive layout
```

---

## 6. Pull Request Rules

### When to open a PR
- ê¸°ëŠ¥ ë¸Œëœì¹?feature/*, fix/*, docs/*)?ì„œ ?‘ì—… ?„ë£Œ ??`develop`?¼ë¡œ ë³‘í•©????- ?ˆë? `main`?¼ë¡œ ì§ì ‘ PR ê¸ˆì? (Lead ??main ?œì™¸)

### PR Checklist (?€???•ì¸ ?¬í•­)
- [ ] ë¸Œëœì¹˜ëª…??ì»¨ë²¤?˜ì„ ?°ë¥´?”ê??
- [ ] ì»¤ë°‹ ë©”ì‹œì§€ê°€ ì»¨ë²¤?˜ì„ ?°ë¥´?”ê??
- [ ] ë¡œì»¬?ì„œ `npm run build` ?ëŠ” `node server.js`ë¡??™ì‘ ?•ì¸?ˆëŠ”ê°€?
- [ ] ê´€???´ìŠˆ ë²ˆí˜¸ë¥?PR ?¤ëª…???¬í•¨?ˆëŠ”ê°€?
- [ ] ìµœì‹  `develop`??merge ?ëŠ” rebase ?ˆëŠ”ê°€? (`git pull origin develop`)
- [ ] ë¶ˆí•„?”í•œ ?Œì¼ (`.bak`, ?„ì‹œ ë¡œê·¸, ?ŒìŠ¤?¸ìš© csv ???€ ì»¤ë°‹?ì„œ ?œì™¸?ˆëŠ”ê°€?

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
| ë¦¬ë·°??| ëª¨ë“  PR?€ Lead Developer(`iredrion-img`)ê°€ ë¦¬ë·° |
| ?‘ë‹µ ?œê°„ | ë¦¬ë·° ?”ì²­ ??ìµœë? 2 ?ì—…???´ë‚´ |
| ë¨¸ì? ê¶Œí•œ | Lead Developerë§?`Merge` ë²„íŠ¼ ?´ë¦­ ê°€??|
| Shared core ë³€ê²?| `server.js`, `ragService.js`, `server/ai/`, `src/services/` ë³€ê²½ì? ???„ê²©?˜ê²Œ ê²€??|
| ê¸°ëŠ¥ ?„ìš© ?Œì¼ ë³€ê²?| `src/pages/WeeklyMeeting.jsx`, `src/components/chat/` ?±ì? ?¼ë°˜ ë¦¬ë·° |

**Comments:**
- `MUST` ??ë¨¸ì? ??ë°˜ë“œ???˜ì •
- `SHOULD` ??ê¶Œì¥ ?˜ì •, ?‘ì˜ ??ê²°ì •
- `NIT` ???¬ì†Œ???¤í??? ? íƒ ?¬í•­

---

## 8. Merge Rules

- **Squash and Merge** ê¶Œì¥: feature ë¸Œëœì¹˜ì˜ WIP ì»¤ë°‹???˜ë‚˜ë¡??•ë¦¬
- **Merge Commit** ?ˆìš©: ì£¼ìš” ê¸°ëŠ¥ ?„ì„± ???ˆìŠ¤? ë¦¬ ë³´ì¡´ ëª©ì 
- **Rebase Merge** ê¸ˆì?: ì¶©ëŒ ?„í—˜ ?’ìŒ
- `develop` ??`main` ë³‘í•©?€ Lead Developerê°€ ?¨ë… ?˜í–‰

---

## 9. Weekly Operating Routine

| ?œì  | ?œë™ |
|------|------|
| **ë§¤ì£¼ ?”ìš”??* | ?´ë²ˆ ì£??‘ì—… ?´ìŠˆ ?ì„± ë°?ë¸Œëœì¹??œì‘ |
| **?‘ì—… ì¤?* | ì»¤ë°‹ ?¨ìœ„ë¡??ì£¼ push, ?‘ì—… ?„ë£Œ ??PR ?ì„± |
| **PR ?ì„± ??* | Lead?ê²Œ Slack/ì¹´í†¡ ?±ìœ¼ë¡?ë¦¬ë·° ?”ì²­ ?Œë¦¼ |
| **ë¦¬ë·° ?„ë£Œ** | Leadê°€ Approve ë°?Merge |
| **ë§¤ì£¼ ê¸ˆìš”??* | ì§„í–‰ ?í™© ?•ë¦¬ ë°??¤ìŒ ì£??‘ì—… ?¬ì „ ?¼ì˜ |

---

## 10. Area Ownership (CODEOWNERS ê¸°ì?)

| ê²½ë¡œ | ?´ë‹¹ |
|------|------|
| `src/pages/WeeklyMeeting.jsx` | Team Member (primary) |
| `src/components/chat/` | Team Member (primary) |
| `server/ai/` | Team Member (primary, Lead review required) |
| `src/pages/Dashboard.jsx` | Lead Developer |
| `src/pages/Timesheet.jsx` | Lead Developer |
| `server.js`, `ragService.js` | Lead Developer (strict review) |
| `server/dataPipeline/` | Lead Developer |
| `server/rag/` | Lead Developer |
| `src/utils/`, `src/services/` | Lead Developer (shared core) |
| `database_2026.csv`, `users.csv` | Lead Developer |
| `.github/`, `package.json` | Lead Developer |
| `scripts/` | Either (Lead preferred) |

---

## 11. Prohibited Actions

| ??ê¸ˆì? ?¬í•­ |
|------------|
| `main` ë¸Œëœì¹˜ì— ì§ì ‘ push |
| `develop` ë¸Œëœì¹˜ì— ë¦¬ë·° ?†ì´ ì§ì ‘ merge |
| `database_2026.csv` ?ëŠ” `users.csv`ë¥?PR ?†ì´ ?…ë°?´íŠ¸ |
| `server.js`, `ragService.js` ?¨ë… ?˜ì • ??push |
| `.bak` ?Œì¼, ?”ë²„ê·?ë¡œê·¸, ?„ì‹œ ?Œì¼ ì»¤ë°‹ |
| ë¸Œëœì¹˜ëª…/ì»¤ë°‹ ë©”ì‹œì§€ ì»¨ë²¤??ë¯¸ì???|
| ë¦¬ë·° ?†ì´ ?ê¸° PR self-merge |

---

## 12. Practical Examples

### ?€?ì´ ì£¼ê°„ ?Œì˜ ê¸°ëŠ¥??ê°œë°œ?˜ëŠ” ê²½ìš°:
```bash
git checkout develop
git pull origin develop
git checkout -b feature/weekly-meeting

# ?‘ì—… ?œì‘...
git add src/pages/WeeklyMeeting.jsx
git commit -m "feat: add weekly meeting registration page"
git push origin feature/weekly-meeting

# GitHub?ì„œ PR ?ì„±: feature/weekly-meeting ??develop
# PR ?œëª©: [feat] Add weekly meeting registration page
# ë¦¬ë“œ?ê²Œ ë¦¬ë·° ?”ì²­
```

### ?€?ì´ Hana ì±—ë´‡ APIë¥??°ë™?˜ëŠ” ê²½ìš°:
```bash
git checkout develop
git pull origin develop
git checkout -b feature/hana-api

git add server/ai/aiOrchestrator.js src/components/chat/
git commit -m "feat: connect hana chatbot response api"
git push origin feature/hana-api

# GitHub?ì„œ PR ?ì„±: feature/hana-api ??develop
```

---

*Last updated: 2026-04-06 | Maintainer: iredrion-img*
