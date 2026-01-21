---
allowed-tools: Bash(git checkout:*), Bash(git merge:*), Bash(git status:*), Bash(git log:*), Bash(git branch:*), Bash(git fetch:*), Bash(git push:*)
description: Merge current branch (or specified branch) to target branch (default: develop)
---

# Git Merge Branch Command

## Context

- Current git status: !`git status`
- Current branch: !`git branch --show-current`
- Branch to merge (default: current branch): !`git branch --show-current`
- Commits to merge: !`git log develop..HEAD --oneline 2>/dev/null || echo "No commits to merge"`
- Develop branch status: !`git fetch origin develop 2>&1 && git log HEAD..origin/develop --oneline 2>/dev/null || echo "Develop is up to date"`
- Uncommitted changes: !`git diff --stat`

## Your task

Merge the current branch (or a specified branch) into a target branch (default: `develop`). Ensure proper validation, handle conflicts gracefully, and follow project conventions.

### Pre-Merge Validation

Before merging, verify:

1. **Branch is not protected:**
   - Never merge from `main` or `develop` branches
   - Must be a feature branch (feat/, fix/, refactor/, hotfix/)

2. **Working directory is clean:**
   - No uncommitted changes (must commit or stash first)
   - All changes are committed

3. **Branch is pushed to remote:**
   - All commits must be pushed to remote
   - Verify branch exists on remote

4. **Target branch is up to date:**
   - Fetch latest from origin: `git fetch origin <target-branch>` (default: develop)
   - Check if local target branch is behind remote
   - Update local target branch if needed

5. **Commits follow convention:**
   - Check commits use conventional commit format
   - Format: `type(scope): subject`
   - Types: feat, fix, refactor, docs, style, test, chore, perf

### Merge Process

1. **Validate current state:**
   - Check if branch has commits to merge
   - Verify branch is not protected (main/develop)
   - Check if working directory is clean
   - Verify branch is pushed to remote

2. **Update target branch:**
   - Fetch latest from origin: `git fetch origin <target-branch>` (default: develop)
   - Checkout target branch: `git checkout <target-branch>`
   - Pull latest changes: `git pull origin <target-branch>`
   - Verify target branch is up to date

3. **Merge branch into target:**
   - Merge the branch: `git merge <branch-name> --no-ff`
   - Use `--no-ff` to create a merge commit (preserves branch history)
   - If merge is fast-forward, warn user

4. **Handle conflicts:**
   - Detect merge conflicts
   - Show conflicted files
   - Provide guidance on resolving conflicts
   - Don't auto-resolve (let user handle)

5. **Push to remote:**
   - After successful merge: `git push origin <target-branch>` (default: develop)
   - Verify push was successful

6. **Return to original branch:**
   - Checkout the original branch: `git checkout <original-branch>`
   - Confirm merge is complete

### Merge Options

- **Default behavior:** Merge current branch to develop
- **Specify source branch:** If branch name provided, merge that branch instead of current
- **Specify target branch:** If target branch provided, merge to that branch instead of develop
- **Fast-forward:** Warn if merge would be fast-forward (suggest rebase instead)
- **No fast-forward:** Always create merge commit with `--no-ff` flag

### Conflict Resolution

If conflicts occur:

1. **Show conflicted files:**
   - List all files with conflicts
   - Show conflict markers location
   - Display: `git status` to show conflicted files

2. **Provide guidance:**
   - Explain how to resolve conflicts
   - Suggest using IDE merge tools
   - Show commands to continue after resolution

3. **Resume merge:**
   - After conflicts resolved: `git add <resolved-files>`
   - Complete merge: `git merge --continue`
   - Or abort: `git merge --abort`

### Safety Checks

1. **Never merge protected branches:**
   - Reject merging from `main` or `develop`
   - Only allow feature branches

2. **Require clean working directory:**
   - Check for uncommitted changes
   - Require stash or commit before merging

3. **Verify branch is pushed:**
   - Check if branch exists on remote
   - Warn if local commits not pushed

4. **Check target branch is up to date:**
   - Fetch and verify target branch is current
   - Warn if target branch has new commits

### Post-Merge Actions

After successful merge:

1. **Verify merge:**
   - Show merge commit
   - Confirm branch is merged
   - Display updated develop branch

2. **Recommend next steps:**
   - Delete feature branch if merged: `git branch -d <branch-name>`
   - Delete remote branch: `git push origin --delete <branch-name>`
   - Continue with other work

3. **Update local branches:**
   - Fetch latest: `git fetch origin`
   - Update other local branches if needed

### Output Format

Display merge status in a clear format:

```
Merge Branch

Source Branch: feat/automation-improvements
Target Branch: develop
Commits to merge: 5

Pre-merge checks:
  ✅ Branch is not protected
  ✅ Working directory is clean
  ✅ Branch is pushed to remote
  ✅ Target branch is up to date

Merging feat/automation-improvements into develop...
  ✅ Merge successful

Merge commit: abc1234 (Merge branch 'feat/automation-improvements' into develop)
Pushed to: origin/develop

Next steps:
  → Delete feature branch: git branch -d feat/automation-improvements
  → Delete remote branch: git push origin --delete feat/automation-improvements
```

### Error Handling

1. **Merge conflicts:**
   - Show conflicted files
   - Provide resolution guidance
   - Allow user to resolve manually

2. **Protected branch:**
   - Reject merge from main/develop
   - Suggest using pull request instead

3. **Uncommitted changes:**
   - Require commit or stash
   - Show uncommitted files

4. **Branch not pushed:**
   - Warn about unpushed commits
   - Suggest pushing first

5. **Target branch behind remote:**
   - Fetch and update target branch first
   - Then proceed with merge

Follow the formatting guidelines in `.cursor/rules/git-best-practices.mdc` and `.cyclus/docs/git-workflow-and-branching.md`


