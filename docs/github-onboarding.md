# KH-WMS GitHub ?¨ë³´??ê°€?´ë“œ (? ê·œ ?€??

> ?˜ì˜?©ë‹ˆ?? ??ë¬¸ì„œ???ˆë¡œ???€?ì´ KH-WMS ?„ë¡œ?íŠ¸??ì²˜ìŒ ì°¸ì—¬????ê°€??ë¨¼ì? ?½ì–´???˜ëŠ” ê°€?´ë“œ?…ë‹ˆ??

---

## 1. ?¬ì „ ì¤€ë¹?
?¤ìŒ ?„êµ¬ë¥?ë¨¼ì? ?¤ì¹˜?˜ì„¸??

- **Node.js** (v18 ?´ìƒ LTS ê¶Œì¥): https://nodejs.org/
- **Git**: https://git-scm.com/
- **ì½”ë“œ ?ë””??*: VS Code ê¶Œì¥ (https://code.visualstudio.com/)

---

## 2. ?€?¥ì†Œ ?´ë¡ 

```bash
git clone https://github.com/iredrion-img/kh-rnd-wms.git
cd kh-rnd-wms
```

---

## 3. ?˜ì¡´???¤ì¹˜ ë°?ê°œë°œ ?œë²„ ?¤í–‰

```bash
npm install
npm run dev         # ê°œë°œ ?œë²„ (Vite, http://localhost:5173)
# ?ëŠ”
node server.js      # ë°±ì—”???œë²„ (http://localhost:3001)
```

> ë³´í†µ?€ ???°ë??ì„ ?™ì‹œ???´ì–´ `npm run dev`?€ `node server.js`ë¥?ê°ê° ?¤í–‰?©ë‹ˆ??

---

## 4. ê°œë°œ ?œì‘ ????develop ë¸Œëœì¹?ìµœì‹ ??
??ƒ ?‘ì—… ?œì‘ ?„ì— `develop`??ìµœì‹  ?íƒœë¡??™ê¸°?”í•©?ˆë‹¤:

```bash
git checkout develop
git pull origin develop
```

---

## 5. ê¸°ëŠ¥ ë¸Œëœì¹?ë§Œë“¤ê¸?
```bash
# develop ê¸°ì??¼ë¡œ ??ë¸Œëœì¹??ì„±
git checkout -b feature/weekly-meeting
# ?ëŠ”
git checkout -b feature/hana-chatbot
```

ë¸Œëœì¹??´ë¦„ ê·œì¹™:
- `feature/<ê¸°ëŠ¥ëª?` ??? ê·œ ê¸°ëŠ¥
- `fix/<ë¬¸ì œëª?` ??ë²„ê·¸ ?˜ì •
- `docs/<ë¬¸ì„œëª?` ??ë¬¸ì„œ ?‘ì—…

---

## 6. ì½”ë“œ ?‘ì„± ë°?ì»¤ë°‹

```bash
# ë³€ê²??Œì¼ ?•ì¸
git status

# ?„ìš”???Œì¼ë§??¤í…Œ?´ì§•
git add src/pages/WeeklyMeeting.jsx
git add src/components/chat/

# ì»¤ë°‹ (ì»¨ë²¤??ì¤€??)
git commit -m "feat: add weekly meeting registration form"
```

ì»¤ë°‹ ë©”ì‹œì§€ ê·œì¹™:
- `feat: ` ????ê¸°ëŠ¥
- `fix: ` ??ë²„ê·¸ ?˜ì •
- `docs: ` ??ë¬¸ì„œ
- `refactor: ` ??ë¦¬íŒ©?°ë§
- `chore: ` ???¤ì •, ?¨í‚¤ì§€ ??
---

## 7. ë¸Œëœì¹?Push

```bash
git push origin feature/weekly-meeting
```

---

## 8. Pull Request ?´ê¸°

1. GitHub ?€?¥ì†Œ ?˜ì´ì§€(https://github.com/iredrion-img/kh-rnd-wms)???‘ì†
2. ?ë‹¨???¨ëŠ” **"Compare & pull request"** ë²„íŠ¼ ?´ë¦­
3. **Base branch**: `develop` ?•ì¸ (`main`?´ë©´ ë°˜ë“œ??`develop`?¼ë¡œ ë³€ê²?
4. PR ?œí”Œë¦¿ì— ë§ê²Œ ?´ìš© ?‘ì„±
5. **Reviewers** ??ª©??`iredrion-img` ì¶”ê?
6. **Submit pull request** ?´ë¦­
7. ë¦¬ë“œ ê°œë°œ?ì—ê²?ì¹´ì¹´?¤í†¡/?¬ë™ ?±ìœ¼ë¡?ë¦¬ë·° ?”ì²­ ?Œë¦¼

---

## 9. ë¦¬ë·° ?´í›„ ?˜ì •

ë¦¬ë·° ì½”ë©˜?¸ê? ?¬ë¦¬ë©?

```bash
# ?„ì¬ feature ë¸Œëœì¹˜ì—???˜ì •
git add <?˜ì •???Œì¼>
git commit -m "fix: address review comments"
git push origin feature/weekly-meeting
```

PR???ë™ ë°˜ì˜?©ë‹ˆ?? ì¶”ê?ë¡??Œë¦´ ?„ìš” ?†ìŠµ?ˆë‹¤.

---

## 10. develop ìµœì‹ ??(ì¶©ëŒ ?ˆë°©)

?‘ì—… ì¤?develop???…ë°?´íŠ¸??ê²½ìš°:

```bash
git checkout develop
git pull origin develop
git checkout feature/weekly-meeting
git merge develop
# ì¶©ëŒ ?´ê²° ??git push origin feature/weekly-meeting
```

---

## 11. ???ˆë? ?˜ì? ë§ì•„????ê²?
| ê¸ˆì? ?¬í•­ | ?´ìœ  |
|-----------|------|
| `git push origin main` | main?€ ì§ì ‘ push ë¶ˆê? (ë³´í˜¸?? |
| `git push origin develop` (ì§ì ‘) | develop??PR???µí•´?œë§Œ ë³‘í•© |
| ë¦¬ë·° ?†ì´ PR self-merge | Leadë§?merge ê¶Œí•œ ê°€ì§?|
| `database_2026.csv` ì§ì ‘ ?¸ì§‘ ??push | ?°ì´???ìƒ ?„í—˜, Lead?€ ë°˜ë“œ???‘ì˜ |
| `server.js`, `ragService.js` ?¨ë… ?˜ì • | ?µì‹¬ ?œë²„ ë¡œì§, Lead ê²€???„ìˆ˜ |
| `.bak`, ?„ì‹œ ?Œì¼ ì»¤ë°‹ | ?€?¥ì†Œ ?¤ì—¼ |

---

## 12. ?ì£¼ ?˜ëŠ” ?¤ìˆ˜ (Common Mistakes)

### ??base branchë¥?main?¼ë¡œ ?¤ì •??ê²½ìš°
PR ?ì„± ?”ë©´?ì„œ baseë¥?**`develop`** ?¼ë¡œ ë°”ê¾¸ë©??©ë‹ˆ??

### ??develop??ìµœì‹ ???„ë‹Œ ?íƒœ?ì„œ ?‘ì—… ?œì‘
```bash
git checkout develop && git pull origin develop
```
????ƒ ë¨¼ì? ?¤í–‰?˜ì„¸??

### ???ˆë¬´ ë§ì? ë³€ê²½ì„ ??ì»¤ë°‹???£ì? ê²½ìš°
ì»¤ë°‹?€ ?‘ê³  ?¼ë¦¬?ì¸ ?¨ìœ„ë¡??˜ëˆ„?¸ìš”. ë¦¬ë·°ê°€ ?¨ì”¬ ?¬ì›Œì§‘ë‹ˆ??

### ??ì»¤ë°‹ ë©”ì‹œì§€ê°€ "update", "fix", "asdf" ??ë°˜ë“œ??`feat: `, `fix: ` ?±ì˜ prefixë¥?ë¶™ì´ê³?êµ¬ì²´?ì¸ ?´ìš©??ê¸°ì¬?˜ì„¸??

---

## 13. ì°¸ê³  ?ë£Œ

- **?‘ì—… ê°€?´ë“œ ?„ì²´**: [README_COLLABORATION.md](../README_COLLABORATION.md)
- **GitHub ?€?¥ì†Œ**: https://github.com/iredrion-img/kh-rnd-wms
- **Git ê¸°ì´ˆ**: https://git-scm.com/book/ko/v2

---

*ê¶ê¸ˆ???ì? ë¦¬ë“œ ê°œë°œ??`iredrion-img`)?ê²Œ ?¸ì œ? ì? ë¬¼ì–´ë³´ì„¸??*
