---
allowed-tools: Bash(git push:*), Bash(git status:*), Bash(git log:*), Bash(git branch:*), Bash(git rev-parse:*), Bash(git rev-list:*), Bash(pnpm test:*), Bash(pnpm lint:*)
description: Push commits with validation
---

# Git Push Command

## Context

- Current git status: !`git status`
- Current branch: !`git branch --show-current`
- Commits ahead of remote: !`git log @{u}..HEAD --oneline 2>/dev/null || echo "No commits ahead"`
- Commits behind remote: !`git log HEAD..@{u} --oneline 2>/dev/null || echo "No commits behind"`
- Remote tracking branch: !`git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "No upstream set"`
- Recent commit messages: !`git log --oneline -5`

## Your task

Push commits to remote with proper validation. Ensure code quality checks pass and commits follow project standards before pushing.

### Pre-Push Validation

Before pushing, verify:

1. **All tests pass:**
   - Run `pnpm test` (or package-specific tests)
   - Ensure no test failures

2. **Linting passes:**
   - Run `pnpm lint`
   - Fix any linting errors

3. **Type checking passes:**
   - Run `pnpm check-types` (if available)
   - Ensure no TypeScript errors

4. **Commit messages follow convention:**
   - Check recent commits use conventional commit format
   - Format: `type(scope): subject`
   - Types: feat, fix, refactor, docs, style, test, chore, perf

5. **Branch protection:**
   - Never push directly to `main` or `develop`
   - Use pull requests for protected branches

### Push Process

1. **Validate current state:**
   - Check if branch has commits to push
   - Verify branch is not protected (main/develop)
   - Check if remote branch exists

2. **Run quality checks:**
   - Run tests (warn if tests fail, but allow override with flag)
   - Run linting (warn if lint fails, but allow override with flag)
   - Check commit message format

3. **Set upstream if needed:**
   - If first push, set upstream: `git push -u origin <branch-name>`
   - Otherwise, use: `git push`

4. **Handle conflicts:**
   - If remote has new commits, warn user to sync first
   - Suggest using `git-sync` command

5. **Confirm push:**
   - Show pushed commits
   - Show remote branch URL
   - Suggest creating PR if ready

### Options

- `--force` or `--force-with-lease`: Only allow for feature branches, warn about force push
- `--skip-checks`: Skip test/lint validation (use with caution)
- `--dry-run`: Show what would be pushed without actually pushing

Follow the formatting guidelines in `.cursor/rules/git-best-practices.mdc` and `.cyclus/docs/git-workflow-and-branching.md`


