---
allowed-tools: Bash(git checkout:*), Bash(git branch:*), Bash(git status:*), Bash(git log:*)
description: Create feature branches with proper naming
---

# Git Branch Command

## Context

- Current git status: !`git status`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -5`
- Available branches: !`git branch -a`
- Develop branch status: !`git log origin/develop..HEAD --oneline 2>/dev/null || echo "No commits ahead"`

## Your task

Create a feature branch following the project's branch naming convention. Ensure the branch is created from `develop` and follows the proper naming format.

### Branch Naming Convention

- **Feature branches**: `feat/{task-number}-{short-description}`
  - Example: `feat/T027-1-link-students`, `feat/006-implement-login-logout`
- **Bugfix branches**: `fix/{issue-number}-{short-description}`
  - Example: `fix/42-email-verification-timeout`
- **Hotfix branches**: `hotfix/{issue-number}-{critical-issue}`
  - Example: `hotfix/critical-auth-bypass`
- **Refactoring branches**: `refactor/{area-being-refactored}`
  - Example: `refactor/auth-service-architecture`

### Validation Rules

1. **Must branch from `develop`** (unless creating hotfix from `main`)
2. **Branch name must follow naming convention** (feat/, fix/, hotfix/, refactor/)
3. **Branch name should be descriptive** but concise (kebab-case)
4. **Check if branch already exists** before creating
5. **Ensure develop is up to date** before branching

### Process

1. **Check current state:**
   - Verify not on a protected branch (main/develop)
   - Check if develop needs to be updated
   - Verify no uncommitted changes (or warn user)

2. **Validate branch name:**
   - Must start with `feat/`, `fix/`, `hotfix/`, or `refactor/`
   - Must be kebab-case (lowercase, hyphens)
   - Should include task/issue number if available

3. **Create branch:**
   - Switch to develop (or main for hotfix)
   - Pull latest changes
   - Create new branch with validated name
   - Switch to new branch

4. **Confirm creation:**
   - Show branch name
   - Show base branch
   - Show next steps (start working, create PR when ready)

Follow the formatting guidelines in `.cursor/rules/git-best-practices.mdc` and `.cyclus/docs/git-workflow-and-branching.md`
