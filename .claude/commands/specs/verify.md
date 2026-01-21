# Verify Phase (/verify)

**Version:** 1.0
**Date:** December 2025
**Purpose:** Full verification of phase implementation against specifications

Verify phase implementation against specifications. Scans codebase, compares to tasks.md specs, marks completed subtasks automatically, identifies gaps, and optionally implements missing functionality.

**Note:** For quick status sync, use `/status`. Use `/verify` for comprehensive audits.

---

## Usage

```bash
/verify P07-ai-foundation
/verify P07-ai-foundation --dry-run
/verify P07-ai-foundation --auto-complete
/verify P07-ai-foundation --auto-fix
/verify P07-ai-foundation T07-001 T07-002
/verify P07-ai-foundation --report
/verify P07-ai-foundation --deep
```

### Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--dry-run` | Show analysis without modifying files | false |
| `--auto-complete` | Only mark checkboxes, don't implement | false |
| `--auto-fix` | Implement missing code automatically | false |
| `--report` | Generate detailed markdown report | false |
| `--deep` | Run tests, type check, lint (slower) | false |
| `--force` | Skip confirmation prompts | false |
| `--verbose` | Show detailed verification steps | false |

---

## Comparison with /status

| Feature | /status | /verify |
|---------|---------|---------|
| Speed | Fast (~5-30 sec) | Slow (~2-5 min) |
| File existence check | ✅ | ✅ |
| Function verification | Basic (grep) | Deep (AST parsing) |
| Multi-tenant verification | Basic | Full isolation check |
| API key verification | Basic | Full middleware check |
| Spec version check | ❌ | ✅ |
| Gap analysis | ❌ | ✅ |
| Auto-fix mode | ❌ | ✅ |
| Report generation | Summary only | Full report |

---

## Process

### Step 1: Locate Phase Tasks

```
If phase provided (e.g., P07-ai-foundation):
  → Find all tasks.md in .atzentis/specs/P07-ai-foundation/T07-*/
  → Build task registry: ID, name, file paths, acceptance criteria

If specific tasks provided (e.g., T07-001 T07-002):
  → Only verify those tasks
```

**Path Format:**
```
.atzentis/specs/P{XX}-{phase-name}/T{XX}-{NNN}-{task-name}/tasks.md
```

### Step 2: Check Spec Version Alignment (CRITICAL)

- Read phase requirements file
- Read task-breakdown.md
- Extract version from **Change Log** section
- For each modification in changelog:
  - **Database columns:** Check if columns exist in schema
  - **Enum values:** Count and compare to spec
  - **New tables:** Verify tables exist
- Flag version mismatches as **P0 (Blocking)** gaps

### Step 3: Multi-Tenant Verification (REQUIRED)

For each service/handler file, verify:

| Check | Pattern | Required |
|-------|---------|----------|
| Use tenantDb | Handlers: `c.get('tenantDb')` | ✅ |
| Services receive tenantDb | `function(input, tenantDb, user)` | ✅ |
| NO tenantId filtering | Tenant DB queries have NO `eq(*.tenantId)` | ✅ |
| Cross-tenant 404 | `throw new NotFoundError` | ✅ |

**Verification Output:**
```
Multi-Tenant Verification:
  ✓ apps/api/src/modules/ai/handlers/create-chat.handler.ts
    Line 12: tenantDb from context found
    Line 20: service receives tenantDb parameter
  ✗ apps/api/src/modules/ai/services/usage.service.ts
    Line 23: WRONG - using `db` instead of `tenantDb`
```

### Step 4: API Key Verification (REQUIRED)

For each route file, verify:

| Check | Pattern | Required |
|-------|---------|----------|
| Auth middleware | `apiKeyAuth` or `authMiddleware` | ✅ |
| Tenant resolution | `resolveTenant` middleware | ✅ |
| Rate limiting | `rateLimit` or `rateLimitMiddleware` | ✅ |
| Scope validation | `validateScope` for mutations | ✅ |

**Verification Output:**
```
API Key Verification:
  ✓ apps/api/src/modules/ai/routes/chat.route.ts
    Line 12: apiKeyAuth middleware
    Line 13: rateLimitMiddleware
    Line 14: resolveTenant
  ✗ apps/api/src/modules/ai/routes/usage.route.ts
    Line 8: MISSING rateLimitMiddleware
```

### Step 5: AI Service Verification (if applicable)

For AI service tasks, verify:

| Check | Pattern | Required |
|-------|---------|----------|
| Rate limit check | `checkRateLimit(tenantId)` | ✅ |
| Cost tracking | `trackAIUsage(tenantId, ...)` | ✅ |
| Semantic cache | `getSemanticCache` / `setSemanticCache` | Recommended |
| Provider abstraction | `aiCore.chat` or `@atzentis/ai-core` | ✅ |
| Streaming support | SSE handler pattern | If streaming |

### Step 6: Frontend Verification (FSD Layers)

For frontend tasks, verify:

| Check | Pattern | Violation |
|-------|---------|-----------|
| No UI imports in apps | `import { Card } from '@atzentis/ui-shadcn'` in apps/ | ❌ Layer violation |
| Views in features | `features/*/ui/views/*.tsx` | Required |
| Components in plural folders | `components/workspaces/` not `workspace/` | Required |
| Form naming | `workspace-form.tsx` (singular) | Required |
| Table naming | `workspaces-table.tsx` (plural) | Required |

### Step 7: Extract Verification Targets

For each subtask, extract:
- **File paths:** From "Files to Create/Modify"
- **Functions/exports:** From implementation steps
- **Tests:** From Testing section
- **Database tables:** From schema references
- **API endpoints:** From route definitions

### Step 8: Scan Codebase (Deep Mode)

For each expected file:
- Check if file exists
- Parse file content (TypeScript AST for .ts/.tsx)
- Extract exports, functions, types
- Check for required implementations
- Verify multi-tenant patterns
- Verify API key patterns

### Step 9: Compare Implementation vs Spec

Build verification matrix:

```typescript
interface VerificationResult {
  subtaskId: string;        // e.g., "T07-001.2"
  workStream: number;       // 1 = Backend, 2 = Frontend
  criterion: string;
  status: 'verified' | 'partial' | 'missing' | 'outdated' | 'violation';
  evidence: string;         // File path and line number
  notes: string;
}
```

### Step 10: Determine Subtask Status

| Status | Criteria | Symbol |
|--------|----------|--------|
| **Complete** | 100% acceptance criteria verified | ✅ |
| **Partial** | 50-99% criteria verified | 🔶 |
| **Started** | 1-49% criteria verified | 🟡 |
| **Not Started** | 0% implementation evidence | ❌ |
| **Violation** | Multi-tenant or API key issues | ⚠️ |

### Step 11: Update tasks.md Files

If not `--dry-run`:
- Mark completed subtasks: `- [ ]` → `- [x]`
- Add verification timestamp
- Update task-level status
- Update Work Stream status

### Step 12: Generate Gap Analysis

- List missing implementations by priority
- Group gaps by: Security (P0), Missing files, Missing functions, Missing tests
- Estimate effort for each gap
- Suggest implementation order

### Step 13: Auto-Fix Mode (--auto-fix)

For each identified gap:
1. Read full subtask spec
2. Generate implementation code
3. Create or update files
4. Verify multi-tenant patterns included
5. Verify API key middleware included
6. Run TypeScript check
7. Update tasks.md on success

---

## Output Format

```
═══════════════════════════════════════════════════════════════════
  VERIFY PHASE: P07 - AI Foundation
═══════════════════════════════════════════════════════════════════

Scanning 8 tasks, 42 subtasks...

───────────────────────────────────────────────────────────────────
SECURITY CHECKS
───────────────────────────────────────────────────────────────────

Multi-Tenant Isolation:
  ✓ 12/12 services have tenantId filters
  ✓ 12/12 services return 404 for cross-tenant
  ✗ 1 violation in usage.service.ts (line 23)

API Key Authentication:
  ✓ 8/8 routes have auth middleware
  ✓ 8/8 routes have rate limiting
  ✗ 1 route missing scope validation

AI Service Patterns:
  ✓ Cost tracking implemented
  ✓ Rate limiting per tenant
  ✗ Semantic caching not implemented (recommended)

───────────────────────────────────────────────────────────────────
TASK STATUS
───────────────────────────────────────────────────────────────────

✅ T07-001: AI Core Setup ████████████████████ 100% (5/5)
   Work Stream 1 (Backend): 3/3 ✓
   Work Stream 2 (Frontend): 2/2 ✓

✅ T07-002: Chat Completion ████████████████████ 100% (5/5)
   Work Stream 1 (Backend): 3/3 ✓
   Work Stream 2 (Frontend): 2/2 ✓

🔶 T07-003: Streaming ███████████████░░░░░ 75% (3/4)
   Work Stream 1 (Backend): 2/2 ✓
   Work Stream 2 (Frontend): 1/2
   ├─ ✅ T07-003.1: SSE Handler
   ├─ ✅ T07-003.2: Stream Parser
   ├─ ✅ T07-003.3: Chat Hook
   └─ ❌ T07-003.4: Streaming UI

⚠️ T07-004: Cost Tracking ████████████████░░░░ 80% (4/5)
   Work Stream 1 (Backend): 3/3 ✓
   Work Stream 2 (Frontend): 1/2
   ├─ ⚠️ T07-004.2: VIOLATION - Missing tenantId filter

───────────────────────────────────────────────────────────────────
PHASE SUMMARY
───────────────────────────────────────────────────────────────────

Total Tasks: 8
├─ ✅ Complete: 5 (62%)
├─ 🔶 Partial: 2 (25%)
├─ ⚠️ Violations: 1 (13%)
└─ ❌ Not Started: 0 (0%)

Total Subtasks: 42
├─ ✅ Verified: 36 (86%)
├─ 🔶 Partial: 3 (7%)
├─ ⚠️ Violations: 1 (2%)
└─ ❌ Missing: 2 (5%)

By Work Stream:
├─ Work Stream 1 (Backend): 95% complete
└─ Work Stream 2 (Frontend): 80% complete

───────────────────────────────────────────────────────────────────
GAP ANALYSIS
───────────────────────────────────────────────────────────────────

Priority P0 (Security - BLOCKING):
  ⚠️ T07-004.2: Wrong database in usage.service.ts
     File: apps/api/src/modules/ai/services/usage.service.ts
     Line: 23
     Fix: Use `tenantDb` instead of `db`, remove tenantId filtering
     Effort: ~15 min

Priority P1 (High):
  ❌ T07-003.4: Streaming UI component (~4h)
  ❌ T07-004.5: Usage dashboard view (~3h)

Priority P2 (Recommended):
  ⚡ Semantic caching not implemented (~4h)

───────────────────────────────────────────────────────────────────
RECOMMENDED ACTIONS
───────────────────────────────────────────────────────────────────

1. FIX IMMEDIATELY (Security):
   /implement T07-004 T07-004.2 --fix-violation

2. Complete remaining subtasks:
   /implement T07-003 T07-003.4
   /implement T07-004 T07-004.5

3. After fixes:
   /verify P07-ai-foundation --report

═══════════════════════════════════════════════════════════════════
```

---

## Gap Report Format (--report)

```markdown
# Verification Report: P07 - AI Foundation

**Generated:** 2025-12-21T15:30:00Z
**Phase:** P07 - AI Foundation
**Spec Version:** 1.2
**Implementation Version:** ~1.1

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Tasks Complete | 5/8 (62%) |
| Subtasks Verified | 36/42 (86%) |
| Security Violations | 1 (P0) |
| Gaps Identified | 3 |
| Estimated Remediation | 7.5 hours |

---

## Security Audit

### Multi-Tenant Isolation

| File | Status | Line | Issue |
|------|--------|------|-------|
| chat.service.ts | ✅ | 45 | tenantId filter present |
| usage.service.ts | ⚠️ | 23 | MISSING tenantId filter |

### API Key Authentication

| Route | Auth | Rate Limit | Scope |
|-------|------|------------|-------|
| /v1/chat | ✅ | ✅ | ✅ |
| /v1/usage | ✅ | ✅ | ❌ |

---

## Work Stream Analysis

### Work Stream 1: Backend

| Task | Subtasks | Status |
|------|----------|--------|
| T07-001 | 3/3 | ✅ Complete |
| T07-002 | 3/3 | ✅ Complete |
| T07-003 | 2/2 | ✅ Complete |
| T07-004 | 3/3 | ⚠️ Violation |

### Work Stream 2: Frontend

| Task | Subtasks | Status |
|------|----------|--------|
| T07-001 | 2/2 | ✅ Complete |
| T07-002 | 2/2 | ✅ Complete |
| T07-003 | 1/2 | 🔶 Partial |
| T07-004 | 1/2 | 🔶 Partial |

---

## Detailed Findings

### T07-003: Streaming

**Status:** 🔶 Partial (75%)

| Subtask | Status | Evidence |
|---------|--------|----------|
| T07-003.1 | ✅ | `apps/api/src/modules/ai/handlers/stream.handler.ts:15` |
| T07-003.2 | ✅ | `packages/ai/core/src/utils/stream-parser.ts:1` |
| T07-003.3 | ✅ | `features/chat/src/hooks/use-chat-stream.ts:1` |
| T07-003.4 | ❌ | File not found: `features/chat/src/ui/components/chat/streaming-message.tsx` |

**Gap Details:**
- T07-003.4: Streaming UI
  - Expected: `streaming-message.tsx` component
  - Found: File does not exist
  - Remediation: Create streaming message component (~4h)

---

## Remediation Plan

| Order | Task | Subtask | Type | Effort | Dependencies |
|-------|------|---------|------|--------|--------------|
| 1 | T07-004 | T07-004.2 | Security Fix | 15min | None |
| 2 | T07-003 | T07-003.4 | Implementation | 4h | None |
| 3 | T07-004 | T07-004.5 | Implementation | 3h | T07-004.2 |

---

## Commands to Execute

```bash
# 1. Fix security violation immediately
/implement T07-004 T07-004.2

# 2. Complete remaining subtasks
/implement T07-003 T07-003.4
/implement T07-004 T07-004.5

# 3. Re-verify
/verify P07-ai-foundation --report
```
```

---

## Context Management

For phases with >8 tasks, use batched processing:

```bash
# Instead of:
/verify P07-ai-foundation  # May hit context limits

# Use batches:
/verify P07-ai-foundation T07-001 T07-002 T07-003 T07-004
/verify P07-ai-foundation T07-005 T07-006 T07-007 T07-008
```

---

## Workflow Integration

```
Development Workflow with /verify:

1. /implement T07-001 through T07-006
   ↓
2. /status P07-ai-foundation --quick
   → Quick progress sync
   ↓
3. /verify P07-ai-foundation --dry-run
   → See security issues and gaps
   ↓
4. /verify P07-ai-foundation
   → Auto-mark completed subtasks
   → Generate gap report
   ↓
5. Fix security violations FIRST
   → /implement T07-004 T07-004.2
   ↓
6. /implement remaining gaps
   ↓
7. /verify P07-ai-foundation --report
   → Generate final verification report
```

---

## Safety Guarantees

1. **Never unchecks:** Won't change `[x]` back to `[ ]`
2. **Dry run first:** Always supports `--dry-run` for preview
3. **Security first:** Violations flagged as P0, block completion
4. **Rollback on failure:** Auto-fix reverts on TypeScript errors
5. **Confirmation prompts:** Large changes require confirmation
6. **Audit trail:** All changes tracked with timestamps
7. **Incremental:** Can run on subset of tasks
8. **Git-aware:** Won't modify files with uncommitted changes (unless `--force`)

---

## Integration with Other Commands

| Command | Relationship |
|---------|-------------|
| `/status` | Quick sync; use /verify for full audit |
| `/implement` | Fix gaps identified by /verify |
| `/specify` | Update specs if requirements changed |
| `/tests` | Generate test plan for coverage gaps |

---

## Notes

- Multi-tenant violations are P0 (blocking) - fix immediately
- API key violations are P0 (blocking) - fix immediately
- Work Stream progress helps identify parallel opportunities
- Use `--deep` for full test execution (slower but thorough)
- Security checks run first, before other verification

---

**Document Version:** 1.0
**Last Updated:** December 2025