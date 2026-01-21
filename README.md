# Atzentis CLI

**Autonomous development orchestrator** — Runs AI agents on phased task specifications until done.

## Overview

Atzentis CLI executes development tasks through AI agents (Claude Code) with:
- **Wave-based parallel execution** — Tasks grouped by dependencies run concurrently
- **Git worktree isolation** — Each task gets its own worktree and branch
- **Crash recovery** — SQLite-backed sessions resume from last checkpoint
- **Phase-driven specs** — Structured task definitions with requirements and context

## Installation

```bash
# npm (recommended)
npm install -g @atzentis/cli
atzentis run --phase p00

# Or clone and install from source
git clone https://github.com/atzentis/atzentis-cli.git
cd atzentis-cli
bun install

# Run directly
bun run dev run --phase p00 --dry-run

# Or build and link globally
bun run build
bun link
atzentis run --phase p00
```

## Quick Start

```bash
# Initialize project configuration
atzentis setup

# Preview execution plan (no changes)
atzentis run --phase p00 --dry-run

# Execute all tasks in phase
atzentis run --phase p00

# Execute specific tasks
atzentis run --tasks T00-001,T00-002

# Run tasks in parallel
atzentis run --phase p00 --parallel --max-parallel 3

# Resume interrupted session
atzentis resume

# Check execution status
atzentis status
```

## Project Structure

Atzentis uses fixed directory names:

```
your-project/
├── .atzentis/                    # CLI configuration
│   ├── cli/
│   │   ├── config.yaml           # Project settings
│   │   └── templates/            # Custom prompt templates
│   └── session.db                # Session persistence
│
└── .project/                     # Task specifications
    ├── docs/                     # Architecture documentation
    └── specs/
        └── P00-foundation-setup/
            ├── meta.json         # Task metadata (dependencies, estimates)
            ├── requirements.md   # Phase requirements
            ├── explanation.md    # Technical context
            └── T00-001-bootstrap/
                └── tasks.md      # Task specification
```

## Task Specification

Each task is a **full specification document** in `tasks.md`. The `meta.json` file is the **authoritative source** for dependencies, estimates, and priorities.

### tasks.md (full specification)

```markdown
# Monorepo Initialization

**Task ID:** T00-001
**Phase:** P00 - Foundation & Setup
**Requirements:** FR-MONO-001
**Total Estimate:** 4 hours
**Priority:** P0 (Critical)
**Dependencies:** None
**Blocks:** All other P00 tasks
**Status:** Not Started

---

## Overview

This task establishes the foundational monorepo infrastructure using Turborepo
and pnpm workspaces. It creates the project structure, build system, and
caching configuration that all subsequent development will depend on.

---

## Technical Specification

### Monorepo Structure

\`\`\`
project/
├── apps/
│   ├── api/
│   ├── client/
│   └── web/
├── packages/
│   ├── database/
│   ├── auth/
│   └── shared/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.json
\`\`\`

---

## Implementation Steps

### T00-001.1: Initialize Project Structure

**Estimate:** 1 hour
**Dependencies:** None
**Skill:** \`monorepo-setup\`

**Read Before Implementing:**
- Turborepo documentation: https://turbo.build/repo/docs
- pnpm workspaces: https://pnpm.io/workspaces

**Files to Create:**
- \`package.json\` - Root package.json with workspace config
- \`pnpm-workspace.yaml\` - Workspace package patterns
- \`.gitignore\` - Git ignore rules for monorepo

**Implementation Steps:**

- [ ] **Step 1:** Initialize root package.json
  - Set name, private: true, packageManager: "pnpm@9.0.0"
  - Add workspace scripts (dev, build, lint, type-check)

- [ ] **Step 2:** Create pnpm-workspace.yaml
  - Add apps/* and packages/* patterns

- [ ] **Step 3:** Create directory structure
  - Create apps/, packages/ directories

**Acceptance Criteria:**

- [ ] Root package.json exists with correct structure
- [ ] pnpm-workspace.yaml configured
- [ ] All directories created

**Testing:**

- [ ] \`pnpm install\` runs without errors
- [ ] Directory structure matches specification

**Checkpoint:** Project structure exists, pnpm workspace recognized

---

### T00-001.2: Configure Turborepo

**Estimate:** 1 hour
**Dependencies:** T00-001.1
**Skill:** \`monorepo-setup\`

**Files to Create:**
- \`turbo.json\` - Turborepo configuration

**Implementation Steps:**

- [ ] **Step 1:** Install Turborepo as devDependency
- [ ] **Step 2:** Create turbo.json with build/dev/lint pipelines
- [ ] **Step 3:** Configure caching (local + remote)

**Acceptance Criteria:**

- [ ] turbo.json exists with correct pipeline config
- [ ] Build pipeline has dependsOn: ["^build"]
- [ ] Dev pipeline has cache: false

**Testing:**

- [ ] \`pnpm turbo build\` runs successfully
- [ ] Cache directory created (.turbo/)

---

## Definition of Done

- [ ] All implementation steps completed
- [ ] All acceptance criteria verified
- [ ] Monorepo structure matches specification
- [ ] Turborepo configured with caching
- [ ] TypeScript strict mode enabled
- [ ] No errors when running \`pnpm install\`
- [ ] \`pnpm turbo build\` succeeds
- [ ] Code reviewed and approved
```

### meta.json (authoritative metadata)

```json
{
  "phase": "P00-foundation-setup",
  "phaseName": "Foundation & Setup",
  "phaseNumber": 0,
  "tasks": [
    {
      "id": "T00-001",
      "name": "monorepo-initialization",
      "title": "Monorepo Initialization",
      "estimate": 4,
      "priority": "P0",
      "status": "not_started",
      "dependencies": [],
      "subtasks": { "total": 4, "completed": 0 }
    },
    {
      "id": "T00-002",
      "name": "api-application-shell",
      "title": "API Application Shell",
      "estimate": 4,
      "priority": "P0",
      "status": "not_started",
      "dependencies": ["T00-001"],
      "subtasks": { "total": 4, "completed": 0 }
    }
  ],
  "stats": {
    "totalTasks": 2,
    "completedTasks": 0,
    "totalEstimate": 8,
    "progressPercent": 0
  },
  "status": "synced",
  "version": "1.0"
}
```

## Configuration

Create `.atzentis/cli/config.yaml`:

```yaml
project: my-project
name: My Project

# Build commands
commands:
  test: bun test
  lint: bun run check
  build: bun run build

# Rules injected into every prompt
rules:
  - Use TypeScript strict mode
  - Follow existing code patterns
  - Write tests for new functionality

# Files AI should never modify
boundaries:
  neverTouch:
    - .env
    - credentials.json

# Lifecycle hooks
hooks:
  beforeTask: echo "Starting ${ATZENTIS_TASK_ID}"
  afterTask: bun run lint
  onSuccess: echo "Task completed"
```

## CLI Options

```bash
atzentis run [options]
  --phase <id>        Phase to execute (e.g., p00, P01)
  --tasks <ids>       Specific task IDs (comma-separated)
  --parallel          Enable parallel execution
  --max-parallel <n>  Max concurrent tasks (default: 3)
  --dry-run           Preview execution plan only
  --fast              Skip tests and lint

atzentis resume [options]
  --project <name>    Project name
  --session <id>      Specific session to resume

atzentis status [options]
  --json              Output as JSON
  --project <name>    Project name

atzentis setup [options]
  --force             Overwrite existing config
```

## Execution Flow

1. **Load tasks** from `.project/specs/P{XX}-*/` directories
2. **Build execution waves** — Group tasks by `parallelGroup`, respect dependencies
3. **Create session** — Persist state to SQLite for crash recovery
4. **For each task:**
   - Create Git worktree at `/tmp/atzentis-cli-worktrees/{project}/{task}`
   - Build prompt from template + task spec + phase context
   - Execute via Claude Code CLI
   - Detect completion token `<promise>COMPLETE</promise>`
   - Save checkpoint
5. **Resume on failure** — `atzentis resume` continues from last checkpoint

## Supported Engines

| Engine | Status | CLI |
|--------|--------|-----|
| Claude Code | ✅ Default | `claude-code` |
| OpenCode | 🔜 Planned | `opencode` |
| Cursor | 🔜 Planned | `cursor` |

## Requirements

- **Runtime:** Bun or Node.js 18+
- **AI CLI:** Claude Code (`claude-code` binary)
- **Git:** For worktree management
- **Optional:** `gh` CLI for PR creation

## Development

```bash
# Install dependencies
bun install

# Run in development
bun run dev run --phase p00 --dry-run

# Type check
bun run typecheck

# Lint and format
bun run check
bun run check:fix

# Run tests
bun test
```

## License

MIT
