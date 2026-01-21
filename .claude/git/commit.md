---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*)
description: Create a git commit
---

# Git Commit Command

## Context

- Current git status: !`git status`
- Current git diff (staged and uncommitted changes): !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`

## Your task

Based on the above changes, create logical, focused commits that break down changes into coherent
groups. Has a focused, single responsibility. Follows conventional commit format. Contains logical
groupings of related changes. Has clear, descriptive commit messages. No co-author information.

Follow the formatting guidelines in .cursor/rules/git-best-practices.mdc

