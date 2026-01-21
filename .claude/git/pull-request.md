---
allowed-tools: Bash(git status:*), Bash(git log:*), Bash(git branch:*), Bash(gh pr:*), Bash(pnpm test:*), Bash(pnpm lint:*)
description: Create pull request with validation and automatic issue linking
---

# Git PR Command

## Context

You have access to these bash commands to gather git and project information as needed:
- `git status` - Show working tree status
- `git branch --show-current` - Get current branch name
- `git log develop..HEAD --oneline` - Show commits ahead of develop
- `git log main..HEAD --oneline` - Show commits ahead of main (fallback)
- `git log --oneline -10` - Show recent commits
- `git rev-parse --abbrev-ref --symbolic-full-name @{u}` - Get upstream tracking branch
- `git log @{u}..HEAD --oneline` - Check if commits are pushed to remote
- `git diff --stat` - Show uncommitted changes
- `git diff develop...HEAD --stat` - Show changes vs develop
- `gh pr list --head <branch>` - Check if PR already exists for branch
- `find .cyclus/specs -name "tasks.md"` - Find task files for issue linking

## Your task

Create a pull request with automatic GitHub issue linking, proper validation, and following project conventions. Ensure the branch is ready and all quality checks pass before creating the PR.

### Pre-PR Validation

Before creating PR, verify:

1. **Branch is not protected:**
   - Never create PR from `main` or `develop` branches
   - Must be on feature branch (feat/, fix/, refactor/, hotfix/)

2. **Commits are ready:**
   - Commits follow conventional commit format
   - Format: `type(scope): subject`
   - Types: feat, fix, refactor, docs, style, test, chore, perf

3. **Branch is pushed to remote:**
   - All commits must be pushed to remote
   - Check if branch exists on remote
   - Set upstream if needed

4. **Quality checks (optional, can skip with flag):**
   - Tests pass: `pnpm test` (warn if fail, allow override)
   - Linting passes: `pnpm lint` (warn if fail, allow override)
   - Type checking: `pnpm check-types` (if available)

5. **Task/Issue detection:**
   - Find related tasks.md file (if feature branch)
   - Extract GitHub issue numbers from tasks.md (`<!-- GitHub: #123 -->`)
   - Extract issue references from commit messages (`#123`, `Closes #123`, etc.)
   - Collect all related issue numbers

### PR Creation Process

1. **Identify task/feature:**
   - Extract task ID from branch name (e.g., `feat/T027-1-link-students` → T027-1)
   - Find tasks.md file in `.cyclus/specs/` matching task ID
   - Read task information (title, description, subtasks, progress)

2. **Generate PR title:**
   - Format: `type(scope): Task-ID: Task Title`
   - Extract type from branch name (feat, fix, refactor, etc.)
   - Extract scope from file paths or task context
   - Use task title from tasks.md if available
   - Fallback to first commit message if no task found

3. **Generate PR body:**
   - **Task reference:** Task ID, feature, requirement (if available)
   - **Changes summary:** List of files changed, estimate
   - **Progress:** X of Y subtasks complete (if task found)
   - **Related tasks:** Other tasks in same feature (if multiple)
   - **Definition of Done:** Checklist from tasks.md (if available)
   - **Issue linking:** `Closes #123`, `Fixes #124`, etc.
   - **Testing notes:** Test status, manual testing done
   - **Deployment notes:** Preview URL, deployment target

4. **Determine base branch:**
   - Default: `develop`
   - Hotfix branches: `main`
   - Can override with `--base` flag
   - Validate base branch exists

5. **Set labels:**
   - Auto-detect from branch type: `feat` → `enhancement`, `fix` → `bug`, etc.
   - Add scope-based labels if applicable
   - Add `ready-for-review` if all checks pass

6. **Create pull request:**
   - Use GitHub CLI: `gh pr create`
   - Or GitHub API if CLI not available
   - Link issues using "Closes #123" format in body
   - Set draft status if `--draft` specified
   - Return PR number and URL

7. **Show results:**
   - Display PR number and URL
   - Show linked issues
   - Show PR title and body preview
   - Show next steps (review, merge, etc.)

### Options

- `--base <branch>`: Override base branch (default: develop)
- `--draft`: Create as draft PR
- `--skip-checks`: Skip test/lint validation (use with caution)
- `--no-issues`: Don't auto-link issues (manual linking)
- `--title "<title>"`: Override auto-generated title
- `--body "<body>"`: Override auto-generated body (can still auto-link issues)

### PR Body Template

```markdown
## Task Reference

- **Task:** T027-1
- **Feature:** T027-guardian-linking
- **Requirement:** FR-ENROLL-002

## Summary

Brief description of changes in this PR.

## Changes

- File: `apps/client/src/app/(dashboard)/guardian/link-students/page.tsx`
- Estimate: 1.5 hours
- Progress: 6 of 7 subtasks complete (86%)

## Related Tasks

- T027-1: Create Link Students Page Route [86%]
- T027-2: Update Invitation Acceptance Redirect [14%]

## Definition of Done

- [x] Page route created and accessible
- [x] Route protection implemented
- [ ] Error boundaries added
- [ ] Code reviewed

## Testing

- [x] Manual testing completed
- [ ] Unit tests added
- [ ] Integration tests added

## Deployment

- Preview: preview.app.cyclus.io
- Target: develop branch

Closes #123
Fixes #124
```

### Error Handling

- **Branch not pushed:** Warn user, suggest using `git-push` first
- **No commits ahead:** Warn that PR will be empty
- **Protected branch:** Error - cannot create PR from main/develop
- **No task found:** Still create PR, but without task details
- **GitHub CLI not available:** Provide instructions to install or use API
- **Issue linking fails:** Warn but continue with PR creation

### Integration with Other Commands

- **git-push:** Should be run before git-pull-request (ensure branch is pushed)
- **git-sync:** Should be run if branch is behind base
- **create-pull-request:** This command provides CLI-focused workflow
- **list-tasks:** Can reference task progress in PR body

Follow the formatting guidelines in `.cursor/rules/git-best-practices.mdc`, `.cyclus/docs/git-workflow-and-branching.md`, and `.cursor/commands/create-pull-request.md`

