# KH-WMS GitHub Onboarding Guide (New Team Member)

> Welcome! Read this document first before starting development on KH-WMS.
> **Development Environment: Antigravity IDE** (same as lead developer)

---

## PART A - Antigravity IDE Setup and Repository Connection

### A-1. Prerequisites

Install the following programs in order:

- **Node.js** (v18 LTS or higher): https://nodejs.org/
- **Git** (latest): https://git-scm.com/
- **Antigravity IDE** (latest): Request installer from iredrion-img

> When installing Git, leave all default options as-is.

---

### A-2. Clone the Repository

Before opening Antigravity IDE, download the code first.

Open Windows PowerShell or CMD and run:

    git clone https://github.com/iredrion-img/kh-rnd-wms.git
    cd kh-rnd-wms
    npm install

Clone location example: C:\Users\[your-name]\kh-rnd-wms

---

### A-3. Open Repository in Antigravity IDE

1. Launch Antigravity IDE
2. Select "Open Folder"
3. Select the kh-rnd-wms folder you cloned above
4. Confirm the project structure is visible in the left file explorer

---

### A-4. Configure Git Identity in Antigravity IDE

Open the terminal panel in Antigravity IDE (shortcut: Ctrl+~ or terminal panel):

    git config user.name "hooooni46-cell"
    git config user.email "your_email@example.com"
    git branch

You should see the develop or main branch listed.

---

### A-5. GitHub Authentication (First Time Only)

A GitHub login window will appear on your first push.

Option A - Password: Enter your GitHub account password
Option B - Personal Access Token (recommended):
  1. GitHub -> Profile (top right) -> Settings
  2. Developer settings -> Personal access tokens -> Tokens (classic)
  3. Generate new token
     - Note: kh-rnd-wms
     - Expiration: 90 days
     - Scopes: check "repo" (all)
  4. Copy token immediately (cannot view again)
  5. Use this token as your password when pushing

---

## PART B - Starting Development in Antigravity IDE

### B-1. Using the AI Assistant

Antigravity IDE has a built-in AI coding assistant.
You can ask it to write code, debug, or explain anything.

Example prompts you can use:
  - "Add a meeting registration form to WeeklyMeeting.jsx"
  - "Connect this component to the /api/meeting endpoint in server.js"
  - "Why is this function returning undefined?"

---

### B-2. Before Every Work Session: Sync develop Branch

In the Antigravity terminal:

    git checkout develop
    git pull origin develop

---

### B-3. Create a Feature Branch

    # For weekly meeting feature
    git checkout -b feature/weekly-meeting

    # For Hana chatbot feature
    git checkout -b feature/hana-chatbot

---

### B-4. Run Development Servers

Open TWO terminal panels in Antigravity and run one in each:

Terminal 1 (Frontend):
    npm run dev
    # -> View at http://localhost:5173

Terminal 2 (Backend):
    node server.js
    # -> View at http://localhost:3001

---

### B-5. Work, Then Commit

Main files you will work on:
  - Weekly Meeting:  src/pages/WeeklyMeeting.jsx
  - Hana Chatbot:    src/components/chat/Chatbot.jsx
  - Hana Chatbot:    src/components/chat/ChatModal.jsx
  - AI Integration:  server/ai/aiOrchestrator.js

After making changes:

    git status
    git add src/pages/WeeklyMeeting.jsx
    git commit -m "feat: add weekly meeting registration form"

Commit message rules:
  feat:      new feature
  fix:       bug fix
  docs:      documentation
  refactor:  code improvement without behavior change
  chore:     config, package updates

---

### B-6. Push Your Branch

    git push origin feature/weekly-meeting

---

### B-7. Create a Pull Request on GitHub

1. Go to https://github.com/iredrion-img/kh-rnd-wms
2. Click the yellow banner "Compare & pull request"
3. Verify base branch is "develop" (NEVER "main")
4. Fill in the PR template (auto-populated)
5. Add iredrion-img as Reviewer
6. Submit PR and notify lead via KakaoTalk/Slack

---

## PART C - NEVER DO THESE

| Prohibited Action | Reason |
|-------------------|--------|
| git push origin main | main is protected, will fail |
| Merge directly to develop without PR | Breaks review process |
| Self-merge your own PR | Only iredrion-img can merge |
| Edit database_2026.csv and push | Risk of data corruption |
| Modify server.js or ragService.js alone | Requires lead review |
| Commit .bak or temp files | Pollutes repository |

---

## PART D - When You Are Stuck

| Situation | Solution |
|-----------|----------|
| git push fails | Contact iredrion-img |
| Server won't start | Run npm install again, then retry |
| Branch conflict | Run git pull origin develop, resolve conflicts |
| Antigravity IDE question | Contact iredrion-img directly |

---

## Onboarding Checklist

- [ ] Node.js installed
- [ ] Git installed
- [ ] Antigravity IDE installed
- [ ] GitHub invitation accepted (iredrion-img/kh-rnd-wms)
- [ ] git clone completed
- [ ] npm install completed
- [ ] Project opened in Antigravity IDE
- [ ] git config user.name set
- [ ] GitHub Personal Access Token created
- [ ] git pull on develop branch succeeded
- [ ] First feature branch created (feature/weekly-meeting or feature/hana-chatbot)
- [ ] Development servers running locally (http://localhost:3001)
- [ ] First commit and push succeeded
- [ ] First PR created successfully

---

If you have any questions, contact the lead developer iredrion-img anytime.
