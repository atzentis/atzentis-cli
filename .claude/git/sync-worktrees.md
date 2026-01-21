# Sync Worktrees

Merge all Git worktree branches into your current feature branch before creating a PR.

## Arguments

- `$ARGUMENTS` - Options: `--dry-run`, `--skip-tests`, `--force`

## Instructions

### 1. Parse Arguments

Check if `$ARGUMENTS` contains:

- `--dry-run` → Show what would be merged, don't actually merge
- `--skip-tests` → Skip validation step after merge
- `--force` → Continue even if a worktree has uncommitted changes

### 2. Validate State

```bash
# Get current branch
git branch --show-current
```

- If on `main` or `develop` → Stop and warn: "Switch to your feature branch first"
- If current branch doesn't start with `feat/` or `phase/` → Ask user to confirm

### 3. Check for Uncommitted Changes

```bash
git status --porcelain
```

- If dirty and not `--force` → Stop and warn: "Commit or stash changes first"

### 4. Discover Worktrees

```bash
git worktree list
```

Parse output to get:

- Worktree path
- Branch name
- Commit hash

### 5. For Each Worktree

```bash
# Check commits ahead of current branch
git log <current-branch>..<worktree-branch> --oneline
```

- Skip if same branch as current
- Skip if no commits ahead
- Skip if branch is `main` or `develop`

If `--dry-run`:

- Just report: "Would merge <branch> (N commits)"

If not dry-run:

- Check worktree for uncommitted changes
- If dirty and not `--force` → Stop
- Merge: `git merge <branch> --no-ff -m "Merge <branch> into <current>"`
- On conflict → Stop and report which branch caused it

### 6. Validation (unless `--skip-tests`)

```bash
pnpm install
pnpm typecheck
pnpm test
```

- On failure → Warn but don't rollback

### 7. Report Summary

```
═══════════════════════════════════════
  Sync Complete
═══════════════════════════════════════

Current branch: feat/enrollment-system

Merged:
  ✓ phase/P22 (3 commits)
  ✓ phase/P35 (5 commits)

Skipped:
  ⊘ phase/P03 (no new commits)

Validation:
  ✓ pnpm install
  ✓ pnpm typecheck
  ✓ pnpm test

Next steps:
  git push origin feat/enrollment-system
  gh pr create --base develop
```

## Error Handling

### Merge Conflict

```
✗ Conflict merging phase/P22

Resolve manually:
  git status                    # see conflicts
  # fix files
  git add .
  git commit

Then re-run: /sync-worktrees
```

### Uncommitted Changes

```
✗ Uncommitted changes detected

Options:
  git stash                     # stash changes
  /sync-worktrees               # run again

Or force:
  /sync-worktrees --force
```

### On develop/main

```
✗ Cannot sync into develop or main

Switch to your feature branch:
  git checkout feat/your-feature
```

## Examples

```bash
# Preview what will be merged
/sync-worktrees --dry-run

# Merge without running tests
/sync-worktrees --skip-tests

# Merge even with uncommitted changes in worktrees
/sync-worktrees --force

# Full merge with validation
/sync-worktrees
```
