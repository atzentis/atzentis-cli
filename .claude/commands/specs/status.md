# Update Task Status (/status)

**Version:** 1.0
**Date:** December 2025
**Purpose:** Scan codebase for implementation evidence and update task status

Scan codebase for implementation evidence and update task/subtask status in spec files. A lightweight alternative to `/verify` focused purely on status synchronization.

---

## Usage

```bash
/status P07-ai-foundation
/status P07-ai-foundation T07-001
/status P07-ai-foundation --dry-run
/status P07-ai-foundation --quick
/status P07-ai-foundation --work-stream 1
/status P07-ai-foundation --force
```

### Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--dry-run` | Preview changes without modifying | false |
| `--quick` | File existence only, skip function checks | false |
| `--work-stream N` | Only check subtasks in Work Stream N | all |
| `--force` | Update even with low confidence | false |
| `--verbose` | Show detailed evidence for each subtask | false |

---

## When to Use

| Scenario | Command |
|----------|---------|
| Quick status check after implementation | `/status P07-ai-foundation --quick` |
| Update all task statuses in a phase | `/status P07-ai-foundation` |
| Check single task status | `/status P07-ai-foundation T07-001` |
| Check backend progress only | `/status P07-ai-foundation --work-stream 1` |
| Preview changes without modifying | `/status P07-ai-foundation --dry-run` |
| Full verification with gap analysis | `/verify P07-ai-foundation` (use verify instead) |

---

## Process

### Step 1: Locate Phase Tasks (Discovery Pass)

```
If phase provided (e.g., P07-ai-foundation):
  → List all T07-* folders in .atzentis/specs/P07-ai-foundation/
  → Build task registry: { id, name, folder, path }
  → DO NOT read file contents yet (avoid context overflow)
  → Count tasks to determine if batching needed (>5 tasks = batch)

If specific task provided (e.g., T07-001):
  → Only process that task's tasks.md file
```

**Path Format:**
```
.atzentis/specs/P{XX}-{phase-name}/T{XX}-{NNN}-{task-name}/tasks.md
```

### Step 2: Extract File Evidence Targets (Batched)

**Read only first 200 lines** of each tasks.md.
Process **5 tasks per batch** to avoid context overflow.

For each subtask, extract:

```typescript
interface EvidenceTarget {
  subtaskId: string;        // e.g., "T07-001.2"
  workStream: number;       // 1 = Backend, 2 = Frontend, etc.
  files: string[];          // From "Files to Create/Modify"
  functions: string[];      // From implementation steps
  exports: string[];        // From barrel exports
  tests: string[];          // From Testing: section
  components: string[];     // From UI component references
  routes: string[];         // From API endpoint mentions
  schemas: string[];        // From database schema references
}
```

### Step 3: Scan Codebase (Fast Mode)

**Quick Scan (`--quick`):**
- File existence only
- No content parsing
- ~5 seconds for large phases

**Standard Scan (default):**
- File existence
- Export verification (parse first 100 lines)
- Function presence (grep for function name)
- Multi-tenant patterns (grep for `tenantId`)
- ~30 seconds for large phases

### Step 4: Determine Completion Status

```typescript
// Status determination:
// - complete: All expected files exist AND all functions found
// - partial: Some files exist OR some functions found
// - not_started: No evidence found

type SubtaskStatus = 'complete' | 'partial' | 'not_started';

function determineStatus(evidence: EvidenceResult): SubtaskStatus {
  const fileScore = evidence.filesFound / evidence.filesExpected;
  const funcScore = evidence.functionsFound / evidence.functionsExpected;
  
  if (fileScore >= 0.9 && funcScore >= 0.8) return 'complete';
  if (fileScore > 0 || funcScore > 0) return 'partial';
  return 'not_started';
}
```

### Step 5: Update tasks.md Files

**Subtask Checkboxes:**
```markdown
# Before
- [ ] T07-001.1: Create schema file

# After (if evidence found)
- [x] T07-001.1: Create schema file
```

**Task-Level Status:**
```markdown
# Before
**Status:** Not Started

# After (based on subtask completion)
**Status:** Complete (5/5 subtasks)
# OR
**Status:** In Progress (3/5 subtasks)
```

**Work Stream Status:**
```markdown
## Work Stream 1: Backend (12h)
Status: Complete (3/3 subtasks) ✓

## Work Stream 2: Frontend (8h)
Status: In Progress (1/2 subtasks)
```

### Step 6: Update Phase-Level Files

After updating all tasks.md, also update:

**task-breakdown.md:**
- Phase header status
- Task Summary table Status column
- Individual task section statuses

**requirements.md:**
- Implementation Status section
- Task Breakdown table

**meta.json (if exists):**
- Update `stats.completedTasks`
- Update `stats.completedSubtasks`
- Update `stats.progressPercent`
- Update `tasks[].status` for each task
- Update `tasks[].subtasks.completed`
- Update `status` field (synced → in_progress → complete)

### Step 7: Generate Summary

```
═══════════════════════════════════════════════════════════════════
  STATUS UPDATE: P07 - AI Foundation
═══════════════════════════════════════════════════════════════════

Scanned 8 tasks, 42 subtasks...

CHANGES:

T07-001: AI Core Setup
  Work Stream 1 (Backend):
    ├─ [x] T07-001.1: Database Schema ✓ (schema file exists)
    ├─ [x] T07-001.2: API Endpoints ✓ (routes + handlers found)
    └─ [x] T07-001.3: Streaming Support ✓ (SSE handler found)
  Work Stream 2 (Frontend):
    ├─ [x] T07-001.4: Feature Package ✓ (package.json exists)
    └─ [ ] T07-001.5: UI Views ✗ (view file not found)
  Status: Not Started → In Progress (4/5)

T07-002: Chat Completion
  Work Stream 1 (Backend):
    ├─ [x] T07-002.1: Service Layer ✓ (service + factory found)
    ├─ [x] T07-002.2: Rate Limiting ✓ (middleware found)
    └─ [x] T07-002.3: Cost Tracking ✓ (trackAIUsage found)
  Work Stream 2 (Frontend):
    ├─ [x] T07-002.4: Chat Hook ✓ (useChat found)
    └─ [x] T07-002.5: Chat UI ✓ (chat-view found)
  Status: Not Started → Complete (5/5) ✓

───────────────────────────────────────────────────────────────────

SUMMARY:

Updated: 6 tasks
  ✅ Complete: 4 tasks
  🔄 In Progress: 2 tasks
  ❌ Not Started: 0 tasks (was 6)

BY WORK STREAM:
  Work Stream 1 (Backend): 100% complete
  Work Stream 2 (Frontend): 75% complete

PHASE STATUS:
  Before: Not Started (0%)
  After:  In Progress (83% - 35/42 subtasks)

FILES MODIFIED:
  • 6 tasks.md files
  • task-breakdown.md
  • requirements.md

═══════════════════════════════════════════════════════════════════
```

---

## Evidence Patterns

### API Evidence (Backend)

| Subtask Pattern | Evidence Check |
|-----------------|----------------|
| Create route `/v1/path` | Grep for `.post('/v1/path'` or `.get('/v1/path'` |
| Create handler `handleX` | Check for `export function handleX` or `export const handleX` |
| Create service `xService` | Check for `export function create` in service file |
| Create factory `xFactory` | Check for `buildRecord` and `buildResponse` |

### Multi-Tenant Evidence (REQUIRED)

| Subtask Pattern | Evidence Check |
|-----------------|----------------|
| Use tenantDb from context | Grep for `c.get('tenantDb')` in handlers |
| DB-per-tenant isolation | Grep for `tenantDb.query` (NOT `db.query` for tenant data) |
| Cross-tenant 404 | Grep for `throw new NotFoundError` |

### API Key Evidence (REQUIRED)

| Subtask Pattern | Evidence Check |
|-----------------|----------------|
| API key middleware | Grep for `apiKeyAuth` or `authMiddleware` in route |
| Scope validation | Grep for `validateScope` or `checkScope` |
| Rate limiting | Grep for `rateLimit` or `rateLimitMiddleware` |

### AI Service Evidence

| Subtask Pattern | Evidence Check |
|-----------------|----------------|
| Cost tracking | Grep for `trackAIUsage` call |
| Rate limiting | Grep for `checkRateLimit` call |
| Semantic caching | Grep for `getSemanticCache` or `setSemanticCache` |
| Provider abstraction | Grep for `aiCore.chat` or `@atzentis/ai-core` import |

### Database Evidence

| Subtask Pattern | Evidence Check |
|-----------------|----------------|
| Define table `tableName` | Grep schema files for `tableName = sqliteTable` |
| Add column `columnName` | Grep for `columnName:` in schema |
| Add tenantId field | Grep for `tenantId: text('tenant_id')` |
| Add soft delete | Grep for `deletedAt: integer('deleted_at')` |

### Component Evidence (Frontend)

| Subtask Pattern | Evidence Check |
|-----------------|----------------|
| Create `MyComponent` | Check for `export function MyComponent` |
| Create hook `useXxx` | Check for `export function useXxx` |
| Create view `xxx-view` | Check for file `xxx-view.tsx` exists |
| Create form `xxx-form` | Check for file `xxx-form.tsx` in components folder |

### Test Evidence

| Subtask Pattern | Evidence Check |
|-----------------|----------------|
| Unit test for service | Check for `{service}.test.ts` exists |
| Integration test | Check for `{resource}.api.test.ts` exists |
| Multi-tenant test | Grep for `Tenant A cannot access Tenant B` |
| E2E test | Check for `{feature}.spec.ts` exists |

---

## Context Management (CRITICAL)

**Problem:** Large phases (8+ tasks) cause "Prompt is too long" errors.

**Solution:** Process tasks in batches (5 per batch).

```
1. DISCOVERY PASS (minimal context):
   - List all T{XX}-* folders in phase
   - Extract task IDs only (no file reading)

2. BATCH PROCESSING (5 tasks per batch):
   Batch 1: T07-001 to T07-005
   Batch 2: T07-006 to T07-008
   ...

3. AGGREGATION PASS:
   - Combine results from all batches
   - Calculate phase totals
   - Calculate work stream totals

4. UPDATE PASS:
   - Update each tasks.md (one at a time)
   - Update task-breakdown.md
   - Update requirements.md
```

### Manual Batching (Alternative)

For very large phases, process manually:

```bash
/status P07-ai-foundation T07-001 T07-002 T07-003 T07-004 T07-005
/status P07-ai-foundation T07-006 T07-007 T07-008
```

---

## Comparison with /verify

| Feature | /status | /verify |
|---------|---------|---------|
| Speed | Fast (~5-30 sec) | Slow (~2-5 min) |
| File existence check | ✅ | ✅ |
| Function verification | Basic (grep) | Deep (AST parsing) |
| Multi-tenant verification | Basic (grep) | Full isolation check |
| API key verification | Basic (grep) | Full middleware check |
| Spec version check | ❌ | ✅ |
| Gap analysis | ❌ | ✅ |
| Auto-fix mode | ❌ | ✅ |
| Report generation | Summary only | Full report |
| Work Stream tracking | ✅ | ✅ |

**When to use /status:** Quick sync after implementing tasks
**When to use /verify:** Full audit before phase completion

---

## Output Formats

### Progress Display

```
P07-ai-foundation: AI Foundation
[████████░░] 83% (35/42 subtasks)

Work Stream 1 (Backend):  [██████████] 100%
Work Stream 2 (Frontend): [██████░░░░] 60%

Tasks:
  ✅ T07-001: AI Core Setup (4/5)
  ✅ T07-002: Chat Completion (5/5) ✓
  🔄 T07-003: Streaming (2/4)
  ❌ T07-004: Cost Tracking (0/3)
```

### Dry Run Output

```
DRY RUN - No files will be modified

Would update:

T07-001: AI Core Setup
  - [ ] T07-001.1 → [x] T07-001.1 (schema file found)
  - [ ] T07-001.2 → [x] T07-001.2 (handler + service found)
  - Status: Not Started → In Progress

T07-002: Chat Completion
  - [ ] T07-002.1 → [x] T07-002.1 (all files found)
  - [ ] T07-002.2 → [x] T07-002.2 (middleware found)
  - Status: Not Started → Complete

Files that would be modified:
  • .atzentis/specs/P07-ai-foundation/T07-001-ai-core-setup/tasks.md
  • .atzentis/specs/P07-ai-foundation/T07-002-chat-completion/tasks.md
  • .atzentis/specs/P07-ai-foundation/task-breakdown.md

Run without --dry-run to apply changes.
```

### Verbose Output

```
T07-001.2: API Endpoints (CRUD)

Evidence found:
  ✓ File: apps/api/src/modules/ai/routes/chat.route.ts
  ✓ File: apps/api/src/modules/ai/handlers/chat.handler.ts
  ✓ File: apps/api/src/modules/ai/services/chat.service.ts
  ✓ Export: createChatCompletion (line 45)
  ✓ Export: streamChatCompletion (line 78)
  ✓ Multi-tenant: tenantId filter found (line 52)
  ✓ API key: authMiddleware applied (line 12)
  ✓ Rate limit: rateLimitMiddleware applied (line 13)

Evidence missing:
  ✗ Test: chat.service.test.ts not found
  ✗ Test: chat.api.test.ts not found

Score: 8/10 evidence points
Status: Complete (tests optional for status)
```

---

## Safety Guarantees

1. **Never unchecks:** Won't change `[x]` back to `[ ]`
2. **Additive only:** Only marks completions, never removes
3. **Conservative:** When in doubt, leaves status unchanged
4. **Idempotent:** Running multiple times produces same result
5. **Git-friendly:** Changes are minimal, easy to review
6. **Work Stream aware:** Tracks progress per stream

---

## Integration with Other Commands

| Command | Relationship |
|---------|-------------|
| `/implement` | Run /status after to sync progress |
| `/verify` | Use /verify for full audit, /status for quick sync |
| `/specify` | /status reads tasks.md created by /specify |

### Workflow

```
/implement T07-001.1  → Code written
/implement T07-001.2  → More code written
/status P07-ai-foundation --quick  → Sync checkboxes
/implement T07-001.3  → Continue
...
/verify P07-ai-foundation  → Full audit before PR
```

---

## Notes

- Process tasks in batches of 5 to avoid context overflow
- Multi-tenant evidence is weighted higher (security critical)
- API key evidence is weighted higher (security critical)
- Tests are checked but not required for "complete" status
- Work Stream progress helps identify parallel opportunities
- Use `--verbose` to debug why a subtask isn't marked complete

---

**Document Version:** 1.0
**Last Updated:** December 2025