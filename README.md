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

Tasks are defined in `tasks.md` with YAML frontmatter:

```yaml
---
name: Bootstrap Project
description: Set up project structure and configuration
status: pending
parallel_group: 1
files:
  - package.json
  - src/main.ts
acceptance_criteria:
  - Project builds successfully
  - All tests pass
---

# Implementation Details

Detailed instructions for the AI agent...
```

Task metadata (dependencies, estimates, priorities) comes from `meta.json`:

```json
{
  "phase": "P00-foundation-setup",
  "phaseName": "Foundation & Setup",
  "tasks": [
    {
      "id": "T00-001",
      "name": "Bootstrap Project",
      "estimate": 4,
      "priority": "P0",
      "dependencies": [],
      "status": "not_started"
    },
    {
      "id": "T00-002",
      "name": "API Shell",
      "estimate": 6,
      "priority": "P1",
      "dependencies": ["T00-001"],
      "status": "not_started"
    }
  ]
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
