# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Development
bun run dev                    # Run CLI directly: bun run src/cli.ts
bun run dev run --phase p00 --dry-run  # Test execution plan without running

# Build
bun run build                  # Build for Bun runtime
bun run build:node             # Build for Node.js

# Quality
bun run check                  # Lint and format check (Biome)
bun run check:fix              # Auto-fix lint/format issues
bun run typecheck              # TypeScript type checking
bun test                       # Run tests
bun test src/core/task-scheduler.test.ts  # Run single test file
```

## Architecture Overview

Atzentis CLI is an autonomous development orchestrator that executes tasks through AI agents (Claude Code). It manages parallel task execution with Git worktrees, session persistence, and crash recovery.

### Execution Flow

```
cli.ts → run.ts → loadTasks() → TaskScheduler.buildExecutionWaves()
                             → SessionManager.createSession()
                             → For each wave (parallel):
                                 → WorktreeManager.createWorktree()
                                 → PromptBuilder.build()
                                 → ClaudeCodeEngine.execute()
                                 → SessionManager.saveCheckpoint()
```

### Core Modules

| Module | Responsibility |
|--------|----------------|
| `core/session-manager.ts` | SQLite persistence in `.atzentis/session.db`. Tracks task state, worktrees, branches, PRs, checkpoints for crash recovery |
| `core/task-scheduler.ts` | Wave-based parallel execution. Groups by `parallelGroup`, respects dependencies, detects cycles |
| `core/task-loader.ts` | Loads tasks from `.project/specs/P{XX}-*/T{XX}-{NNN}-*/`. Merges `tasks.md` with `meta.json` metadata |
| `core/phase-loader.ts` | Loads phase metadata and documentation (requirements.md, explanation.md) for prompt injection |
| `core/worktree-manager.ts` | Git worktrees per task at `/tmp/atzentis-cli-worktrees/{project}/{task}` |
| `engines/claude-code.ts` | Spawns `claude-code` CLI, monitors for `<promise>COMPLETE</promise>`, implements retry with backoff |
| `prompt/builder.ts` | Handlebars templates. Resolution: project template → `.atzentis/cli/templates/` → bundled |

### Directory Structure

```
.atzentis/                    # CLI config (always this name)
├── cli/config.yaml           # Project configuration
├── cli/templates/            # Custom prompt templates
└── session.db                # SQLite session state

.project/                     # Project content (always this name)
├── docs/                     # Architecture docs
└── specs/                    # Phase and task specs
    └── P{XX}-{phase-name}/
        ├── meta.json         # Phase metadata (dependencies, estimates)
        ├── requirements.md   # Phase requirements (injected into prompts)
        ├── explanation.md    # Technical context (injected into prompts)
        └── T{XX}-{NNN}-{task-name}/
            └── tasks.md      # Task spec with YAML frontmatter
```

### Key Patterns

- **Task IDs**: `T{XX}-{NNN}` (e.g., T00-001). Phase derived from first two digits
- **Phase IDs**: `P{XX}` (e.g., P00). Case-insensitive in CLI options
- **Completion Token**: `<promise>COMPLETE</promise>` signals task completion
- **meta.json is authoritative**: Task dependencies, estimates, and priorities come from `meta.json`, not `tasks.md`

### Schemas (Zod)

All data structures validated at runtime via Zod schemas in `config/schemas.ts`:
- `TaskSchema` - Task definition with dependencies, files, acceptance criteria
- `PhaseMetaSchema` - Phase metadata including task entries and stats
- `SessionSchema` - Session state for persistence
- `ProjectConfigSchema` - Project configuration

### Engine System

Registry pattern in `engines/engine-registry.ts`. Currently supports Claude Code only. Engines implement:
```typescript
interface Engine {
  name: string;
  execute(prompt: string, options: ExecuteOptions): Promise<ExecutionResult>;
}
```

## Important Conventions

- Fixed directories: `.atzentis/` for CLI, `.project/` for content (not configurable)
- Tasks load from filesystem but metadata (dependencies/estimates) from `meta.json`
- Worktrees created in `/tmp/atzentis-cli-worktrees/` by default
- Branch naming: `{project}/{taskId}` (lowercase)
- Sessions persist across CLI restarts (SQLite)
