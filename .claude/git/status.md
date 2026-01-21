---
allowed-tools: Bash(git status:*), Bash(git log:*), Bash(git branch:*), Bash(git diff:*)
description: Enhanced status with recommendations
---

# Git Status Command

## Context

You have access to these bash commands to gather git information as needed:
- `git status` - Show working tree status
- `git branch --show-current` - Get current branch name
- `git diff --stat` - Show uncommitted changes
- `git diff --staged --stat` - Show staged changes
- `git log --oneline -10` - Show recent commits
- `git branch -vv` - Show branch tracking information

## Your task

Show enhanced git status with actionable recommendations. Help the user understand their current git state and what actions they should take next.

### Status Information to Display

1. **Current Branch:**
   - Branch name
   - Whether it's a protected branch (main/develop)
   - Upstream tracking status

2. **Working Directory:**
   - Uncommitted changes (modified, added, deleted files)
   - Staged changes
   - Untracked files
   - File count and summary

3. **Branch Status:**
   - Commits ahead of remote
   - Commits behind remote
   - Diverged branches (ahead and behind)

4. **Recent Activity:**
   - Last 5 commits
   - Commit message format validation

### Recommendations

Based on the current state, provide actionable recommendations:

1. **If uncommitted changes:**
   - Recommend staging and committing
   - Suggest logical grouping of changes
   - Show files that should be committed together

2. **If commits ahead of remote:**
   - Recommend pushing commits
   - Suggest using `git-push` command
   - Warn if pushing to protected branch

3. **If commits behind remote:**
   - Recommend syncing with remote
   - Suggest using `git-sync` command
   - Warn about potential conflicts

4. **If branch diverged:**
   - Recommend syncing before pushing
   - Explain rebase vs merge options

5. **If on protected branch:**
   - Warn about direct commits
   - Suggest creating feature branch

6. **If no upstream set:**
   - Recommend setting upstream on first push
   - Show command to set upstream

7. **If commit messages don't follow convention:**
   - Show examples of proper format
   - Reference git-best-practices.mdc

### Output Format

Display status in a clear, organized format:

```
Current Branch: feat/T027-1-link-students
Upstream: origin/feat/T027-1-link-students

Working Directory:
  Modified: 3 files
  Staged: 2 files
  Untracked: 1 file

Branch Status:
  Ahead of remote: 2 commits
  Behind remote: 0 commits

Recommendations:
  ✓ Ready to push (2 commits ahead)
  → Use /git-push to push commits
  → Consider creating PR when ready
```

Follow the formatting guidelines in `.cursor/rules/git-best-practices.mdc` and `.cyclus/docs/git-workflow-and-branching.md`


