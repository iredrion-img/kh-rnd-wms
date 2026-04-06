# GitHub Remote Settings Checklist
# KH-WMS 협업 환경 원격 설정 체크리스트
# 
# Usage: 이 파일은 참고용입니다. 각 항목을 GitHub 웹 UI에서 직접 설정하세요.
# Reference: README_COLLABORATION.md

## ── STEP 1: Invite Collaborator ─────────────────────────────────────────────
- [ ] GitHub > Settings > Collaborators and teams
       → "Add people" → @TEAM_MEMBER_GITHUB_ID 초대
       → Role: "Write" 권한 부여 (Admin 불필요)
       → 팀원이 이메일 초대 수락

## ── STEP 2: Create develop Branch ──────────────────────────────────────────
- [ ] 로컬에서 develop 브랜치 생성 및 push (아래 명령어):
       git checkout -b develop
       git push origin develop
- [ ] GitHub > Code 탭에서 develop 브랜치 확인

## ── STEP 3: Set Default Branch to develop ──────────────────────────────────
- [ ] GitHub > Settings > General > Default branch
       → develop으로 변경 (PR 기본 타겟이 develop이 됨)

## ── STEP 4: Branch Protection — main ───────────────────────────────────────
- [ ] GitHub > Settings > Branches > "Add branch protection rule"
       Branch name pattern: main
       ☑ Require a pull request before merging
         - Require approvals: 1
         - ☑ Dismiss stale pull request approvals when new commits are pushed
       ☑ Require status checks to pass before merging (optional)
       ☑ Do not allow bypassing the above settings
       ☑ Restrict who can push to matching branches → @LEAD_GITHUB_ID only
       → Save changes

## ── STEP 5: Branch Protection — develop (Optional but Recommended) ──────────
- [ ] GitHub > Settings > Branches > "Add branch protection rule"
       Branch name pattern: develop
       ☑ Require a pull request before merging
         - Require approvals: 1
       ☐ (Do NOT check "Restrict who can push" — Lead needs to push directly if needed)
       → Save changes

## ── STEP 6: Enable CODEOWNERS Reviews ──────────────────────────────────────
- [ ] .github/CODEOWNERS 파일에서 @LEAD_GITHUB_ID, @TEAM_MEMBER_GITHUB_ID를 실제 ID로 교체
- [ ] Branch protection rule에서:
       ☑ Require review from Code Owners 활성화 (main + develop 둘 다)

## ── STEP 7: Merge Strategy ──────────────────────────────────────────────────
- [ ] GitHub > Settings > General > Pull Requests
       ☑ Allow squash merging (권장 — 기본 설정)
       ☑ Allow merge commits (주요 기능 완성 시 히스토리 보존)
       ☐ Allow rebase merging (비활성화 권장)

## ── STEP 8: Placeholder 실제 ID로 교체 ─────────────────────────────────────
- [ ] README_COLLABORATION.md — @LEAD_GITHUB_ID, @TEAM_MEMBER_GITHUB_ID 교체
- [ ] .github/CODEOWNERS — 동일 교체
- [ ] .github/ISSUE_TEMPLATE/feature_request.md — 동일 교체
- [ ] docs/github-onboarding.md — @LEAD_GITHUB_ID 교체

## ── STEP 9: Push Collaboration Files ───────────────────────────────────────
- [ ] git add README_COLLABORATION.md .github/ docs/github-onboarding.md
- [ ] git commit -m "docs: add github collaboration framework"
- [ ] git push origin main (또는 develop)

## ── STEP 10: Share Onboarding Link with Team Member ────────────────────────
- [ ] 초대 수락 확인 후 팀원에게 아래 URL 공유:
       https://github.com/iredrion-img/kh-rnd-wms/blob/develop/docs/github-onboarding.md
