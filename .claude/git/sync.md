---
allowed-tools: Bash(git fetch:*), Bash(git merge:*), Bash(git rebase:*), Bash(git status:*), Bash(git log:*), Bash(git branch:*)
description: Sync with develop branch
---

# Git Sync Command

## Context

- Current git status: !`git status`
- Current branch: !`git branch --show-current`
- Develop branch commits: !`git log develop..HEAD --oneline 2>/dev/null || echo "No commits in current branch"`
- Current branch commits: !`git log HEAD..develop --oneline 2>/dev/null || echo "No commits in develop"`
- Uncommitted changes: !`git diff --stat`
- Remote develop status: !`git fetch origin develop 2>&1 && git log HEAD..origin/develop --oneline 2>/dev/null || echo "No new commits in remote develop"`

## Your task

Sync the current branch with the latest changes from `develop`. Handle conflicts gracefully and ensure a clean merge or rebase.

### Sync Strategy

1. **Check prerequisites:**
   - Verify not on protected branch (main/develop)
   - Check for uncommitted changes (must commit or stash first)
   - Verify develop branch exists locally

2. **Fetch latest changes:**
   - Run `git fetch origin develop`
   - Get latest commits from remote develop

3. **Choose sync method:**
   - **Rebase (default for feature branches):** Cleaner history, linear commits
   - **Merge (if rebase conflicts):** Preserves branch history, creates merge commit

4. **Handle conflicts:**
   - Detect merge/rebase conflicts
   - Show conflicted files
   - Provide guidance on resolving conflicts
   - Don't auto-resolve (let user handle)

5. **Verify sync:**
   - Confirm branch is up to date with develop
   - Show final status

### Sync Process

1. **Pre-flight checks:**
   ```
   - Check for uncommitted changes
   - Verify branch is not develop/main
   - Fetch latest from origin
   ```

2. **Determine sync method:**
   - If feature branch: Use rebase (cleaner history)
   - If many commits or complex history: Suggest merge
   - If conflicts expected: Warn user

3. **Execute sync:**
   - Rebase: `git rebase origin/develop`
   - Merge: `git merge origin/develop`
   - Handle conflicts if they occur

4. **Post-sync:**
   - Show updated commit history
   - Confirm branch is synced
   - Recommend next steps (push, continue work)

### Conflict Resolution

If conflicts occur:

1. **Show conflicted files:**
   - List all files with conflicts
   - Show conflict markers location

2. **Provide guidance:**
   - Explain how to resolve conflicts
   - Suggest using IDE merge tools
   - Show commands to continue after resolution

3. **Resume sync:**
   - After conflicts resolved: `git rebase --continue` or `git merge --continue`
   - Or abort: `git rebase --abort` or `git merge --abort`

### Options

- `--merge`: Force merge instead of rebase
- `--rebase`: Force rebase instead of merge
- `--abort`: Abort current sync operation if in progress

### Safety Checks

- Never sync protected branches (main/develop)
- Require clean working directory (no uncommitted changes)
- Warn before force push after rebase
- Backup current state before destructive operations

Follow the formatting guidelines in `.cursor/rules/git-best-practices.mdc` and `.cyclus/docs/git-workflow-and-branching.md`


