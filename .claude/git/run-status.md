---
allowed-tools: Bash(gh run:*), Bash(gh api:*), Bash(git log:*), Bash(git branch:*)
description: Check latest GitHub Actions workflow run and display lint and build errors
---

# Git Run Status Command

## Context

You have access to these bash commands to gather GitHub Actions information:
- `gh run list --workflow=build.yml --limit 1` - Get latest build workflow run
- `gh run view <run-id>` - View workflow run details
- `gh run view <run-id> --json jobs` - Get job details in JSON format
- `gh run view <run-id> --log --job <job-id>` - Get job logs
- `git branch --show-current` - Get current branch name
- `git log --oneline -1` - Get latest commit

## Your task

Check the latest GitHub Actions workflow run and display lint and build errors in a readable format. Help developers quickly identify and fix CI/CD failures.

### Workflow Run Information

1. **Get Latest Workflow Run:**
   - Use `gh run list --workflow=build.yml --limit 1 --json databaseId,status,conclusion,headBranch,headSha,createdAt,workflowName,displayTitle` to get the most recent build workflow run
   - Fallback to any workflow if build.yml doesn't exist: `gh run list --limit 1 --json databaseId,status,conclusion,headBranch,headSha,createdAt,workflowName,displayTitle`
   - Extract run ID, status, branch, commit SHA, and timestamp

2. **Extract Job Information:**
   - Use `gh run view <run-id> --json jobs --jq '.jobs[] | {name: .name, status: .status, conclusion: .conclusion, id: .databaseId}'` to get all jobs
   - Filter for jobs that contain "lint", "Lint", "build", "Build", "type-check", "Type check" in their names
   - Identify failed jobs (conclusion: "failure")
   - Get job IDs for failed jobs

3. **Extract Error Messages:**
   - For each failed job, use `gh run view <run-id> --log --job <job-id>` to get logs
   - Parse logs to extract:
     - ESLint errors and warnings (look for patterns like "✖", "error", "Warning:", file paths with line numbers)
     - TypeScript compilation errors (look for "error TS", file paths with line:column)
     - Build failures (look for "Error:", "failed", "FAILED", exit codes)
     - Test failures (if applicable)
   - Filter out noise (warnings about cache signing, post-job cleanup, etc.)
   - Group errors by file and type

4. **Format and Display:**
   - Show workflow run summary (status, branch, commit, time, run ID)
   - List all jobs with their status (success ✅, failure ❌, skipped ⏭️, cancelled 🚫)
   - Display formatted error messages grouped by job
   - Show file paths and line numbers for errors
   - Provide actionable recommendations

### Output Format

Display status in a clear, organized format:

```
GitHub Actions Status Report

Latest Workflow Run:
  Workflow: Build & Test
  Status: ❌ Failed
  Branch: feat/automation-improvements
  Commit: 9c1ecbd (refactor(claude): rename git-pr command to git-pull-request)
  Run ID: 19409841844
  Time: 2 minutes ago
  URL: https://github.com/vassilibo/cyclus/actions/runs/19409841844

Job Status:
  ✅ Pre check
  ✅ Detect changes / dry-run
  ✅ Lint
  ❌ Type check
  ✅ Build API
  ✅ Build Admin
  ❌ Build Client
  ✅ Build Chat
  ✅ Build Web
  ⏭️ Test (skipped)
  ❌ Status check

Failed Jobs:

❌ Type check (Job ID: 55529741161)
  Error: TypeScript compilation failed
  [Extract actual TypeScript errors from logs]
  Example:
    apps/api/src/routes/users.ts
      Line 45:12 - error TS2339: Property 'id' does not exist on type 'User'

❌ Build Client (Job ID: 55529741200)
  Error: Build failed
  [Extract actual build errors from logs]
  Example:
    Error: Cannot find module '@/components/Button'
    at apps/client/src/pages/index.tsx:12:1

Recommendations:
  → Fix TypeScript errors in API routes
  → Resolve missing module imports in Client app
  → Run 'pnpm check-types' locally to catch type errors early
  → Run 'pnpm build' locally to verify builds before pushing
```

### Error Handling

1. **No workflow runs:**
   - Display message: "No workflow runs found. This may be a new repository or workflows haven't run yet."

2. **GitHub CLI not authenticated:**
   - Display message: "GitHub CLI is not authenticated. Run 'gh auth login' to authenticate."

3. **No failed jobs:**
   - Display success message: "✅ All jobs passed! No errors found."

4. **Job logs unavailable:**
   - Display message: "Unable to retrieve logs for job <job-name>. Check the GitHub Actions UI for details."

5. **No lint/build jobs found:**
   - Display message: "No lint or build jobs found in this workflow run."

### Recommendations

Based on the errors found, provide actionable recommendations:

1. **If lint errors:**
   - Suggest running `pnpm lint` locally
   - Suggest using `pnpm lint --fix` for auto-fixable issues
   - Reference specific files that need attention

2. **If build errors:**
   - Suggest running `pnpm build` locally
   - Check for missing dependencies
   - Verify TypeScript configuration

3. **If type check errors:**
   - Suggest running `pnpm check-types` locally
   - Check for missing type definitions
   - Verify import paths

4. **If multiple errors:**
   - Prioritize by severity (errors before warnings)
   - Group by package/app for easier fixing
   - Suggest fixing one package at a time

### Log Parsing Strategy

When parsing logs, look for:

1. **ESLint errors:**
   - Pattern: `✖ \d+ problems?`
   - Pattern: `file.ts:line:col  error/warning  message`
   - Pattern: `ESLint found too many warnings`

2. **TypeScript errors:**
   - Pattern: `error TS\d+: message`
   - Pattern: `file.ts(line,col): error TS\d+: message`
   - Pattern: `Found \d+ error`

3. **Build errors:**
   - Pattern: `Error: message`
   - Pattern: `FAILED` or `failed`
   - Pattern: `Cannot find module`
   - Pattern: `exit code \d+`

4. **Filter out:**
   - Cache warnings: `signing artifact failed`
   - Post-job cleanup messages
   - Setup/teardown messages
   - Success messages

Follow the formatting guidelines in `.cursor/rules/git-best-practices.mdc` and `.cyclus/docs/git-workflow-and-branching.md`


