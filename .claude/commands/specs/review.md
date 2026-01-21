# Review Specifications (/review)

**Version:** 1.0
**Date:** December 2025
**Purpose:** Validate and fix specification files against templates

Review and fix all specifications in a phase to align with Atzentis implementation standards AND template formats.

**Comparison with /verify:**
- `/review` = Validates **spec files** (tasks.md format, template compliance)
- `/verify` = Validates **implementation** (code against specs)

---

## Usage

```bash
/review P07-ai-foundation
/review P07-ai-foundation --dry-run
/review P07-ai-foundation --fix
/review P07-ai-foundation T07-001
```

### Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--dry-run` | Show issues without modifying files | false |
| `--fix` | Auto-fix issues where possible | false |
| `--verbose` | Show detailed validation steps | false |

---

## Process

You are reviewing all specifications in `.atzentis/specs/P{XX}-{phase-name}/` to ensure they follow:

1. **Template formats** (header fields, required sections)
2. **Atzentis patterns** (multi-tenant, API key, FSD)
3. **Import paths** (correct package references)
4. **Naming conventions** (file names, component names)

---

## Step 1: Load Standards

First, load the templates to understand correct patterns:

```bash
echo "=== Task Structure Template ===" 
head -100 .atzentis/docs/templates/task-structure.md

echo ""
echo "=== Task Breakdown Template ===" 
head -100 .atzentis/docs/templates/task-breakdown.md

echo ""
echo "=== Requirements Template ===" 
head -100 .atzentis/docs/templates/requirements.md
```

---

## Step 2: Check Current Structure

```bash
echo "=== Backend Modules ===" 
ls apps/api/src/modules/ 2>/dev/null || echo "Not found"

echo ""
echo "=== Features ===" 
ls features/ 2>/dev/null || echo "Not found"

echo ""
echo "=== UI Packages ===" 
ls packages/ui/ 2>/dev/null || echo "Not found"
```

---

## Step 3: List Specs to Review

```bash
echo "=== Phase Directory ==="
ls -la .atzentis/specs/P{XX}-{phase-name}/ 2>/dev/null

echo ""
echo "=== Task Breakdown File ==="
ls -la .atzentis/specs/P{XX}-{phase-name}/task-breakdown.md 2>/dev/null

echo ""
echo "=== Requirements File ==="
ls -la .atzentis/specs/P{XX}-{phase-name}/requirements.md 2>/dev/null

echo ""
echo "=== Task Files ==="
find .atzentis/specs/P{XX}-{phase-name}/ -name "tasks.md" -type f | sort
```

---

## Part A: Import/Path Violations

Check each spec for Atzentis-specific import patterns:

| Wrong | Correct |
|-------|---------|
| `@project/database` | `@atzentis/db` |
| `@db` | `@atzentis/db` |
| `@/components/ui/*` | `@atzentis/ui-shadcn` |
| `@ui/shadcn` | `@atzentis/ui-shadcn` |
| `src/__tests__/` | `tests/` |
| `nanoid` or `cuid2` | `createId() from @atzentis/db/utils` |
| `api/use-resource.ts` | `hooks/use-resource.ts` |
| `@cyclus/*` | `@atzentis/*` |

---

## Part B: Task File Template Violations

### B1: Required Header Fields

Every tasks.md file MUST have these fields:

```markdown
# {Task Name}

**Task ID:** T{XX}-{NNN}
**Phase:** P{XX} - {Phase Name}
**Requirements:** FR-{AREA}-{NNN}, FR-{AREA}-{NNN}
**Total Estimate:** {X} hours
**Priority:** P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low)
**Dependencies:** T{XX}-{NNN} or None
**Blocks:** T{XX}-{NNN} or None
**Status:** Not Started | In Progress | Complete | Blocked
```

**Common Header Violations:**

| Wrong | Correct |
|-------|---------|
| `**Estimated Hours:** 4` | `**Total Estimate:** 4 hours` |
| `**Priority:** High` | `**Priority:** P1 (High)` |
| `**Status:** ❌ Not Started` | `**Status:** Not Started` |
| `**Status:** 🚧 In Progress` | `**Status:** In Progress` |
| Missing `**Task ID:**` | Add `**Task ID:** T{XX}-{NNN}` |
| Missing `**Phase:**` | Add `**Phase:** P{XX} - {Phase Name}` |

### B2: Required Subtask Structure

Each subtask MUST follow this format:

```markdown
### T{XX}-{NNN}.{N}: {Subtask Name}

**Estimate:** {X} hours
**Dependencies:** None | T{XX}-{NNN}.{N}
**Blocks:** None | T{XX}-{NNN}.{N}

**Files to Create/Modify:**
- `{path/to/file.ts}` - {Purpose}

**Implementation Steps:**
- [ ] **Step 1:** {Action}
  - {Sub-action 1}
  - {Sub-action 2}

**Acceptance Criteria:**
- [ ] {Criterion 1}
- [ ] {Criterion 2}

**Testing:**
- [ ] Unit test: {Test case}
- [ ] Integration test: {Test case}
```

**Common Subtask Violations:**

| Wrong | Correct |
|-------|---------|
| `### S1: Name` | `### T07-001.1: Name` |
| `### Subtask 1: Name` | `### T07-001.1: Name` |
| Missing `**Files to Create/Modify:**` | Add section |
| Missing `**Testing:**` | Add section |

### B3: Required Sections

Every tasks.md MUST have:

| Section | Required |
|---------|----------|
| `## Overview` | YES |
| `## Multi-Tenant Considerations` | YES |
| `## API Key Considerations` | YES |
| `## Technical Specification` | YES |
| `## Work Stream Overview` | YES |
| `## Overall Testing Checklist` | YES |
| `## Error Handling` | YES |
| `## Security Considerations` | YES |
| `## Definition of Done` | YES |
| `## References` | YES |

### B4: Checkbox State

**CRITICAL:** For tasks with `**Status:** Not Started`, all checkboxes MUST be unchecked:

| Wrong | Correct |
|-------|---------|
| `- [x] AC1: Something` (in Not Started task) | `- [ ] AC1: Something` |

---

## Part C: Multi-Tenant Pattern Checks

Every tasks.md should reference multi-tenant patterns:

### C1: Database Schema References

```markdown
**Must include:**
- `tenantId: text('tenant_id').notNull()` in schema
- Index on tenantId
- Soft delete with `deletedAt`
```

### C2: Service References

```markdown
**Must include pattern:**
// Handlers use tenantDb from context
const tenantDb = c.get('tenantDb');

// Tenant data queries - NO tenantId filtering (DB-level isolation)
const items = await tenantDb.query.resources.findMany({
  where: isNull(resources.deletedAt)
});
```

### C3: Error Handling Table

Must include these rows:

| Error Case | HTTP Status |
|------------|-------------|
| Resource not found | 404 |
| Cross-tenant access | 404 (NOT 403) |
| Missing API key | 401 |
| Invalid API key | 401 |
| Rate limit exceeded | 429 |

---

## Part D: API Key Pattern Checks

### D1: Route References

```markdown
**Must include middleware:**
- apiKeyAuth (or authMiddleware)
- resolveTenant
- rateLimit (or rateLimitMiddleware)
```

### D2: Scope References

```markdown
**Must include:**
- Required scopes listed (e.g., `workspaces:read`, `workspaces:write`)
```

---

## Part E: Frontend Pattern Checks (FSD)

### E1: View Naming

| Wrong | Correct |
|-------|---------|
| `workspaces-list-view.tsx` | `workspaces-view.tsx` |
| `workspace-form-view.tsx` | `components/workspaces/workspace-form.tsx` |

### E2: Component Folder Naming

| Wrong | Correct |
|-------|---------|
| `components/workspace/` | `components/workspaces/` (plural) |

### E3: Layer Imports

| Wrong | Correct |
|-------|---------|
| Apps importing `@atzentis/ui-shadcn` | Apps import from `@atzentis/{feature}/views` |

---

## Part F: Task Breakdown Template Violations

### F1: Required Header Fields

```markdown
# Phase {XX}: {Phase Name} - Task Breakdown

**Version:** 1.0
**Date:** {YYYY-MM-DD}
**Total Tasks:** {X}
**Total Estimate:** {X} hours
**Status:** Not Started | In Progress | Complete
```

**Common Violations:**

| Wrong | Correct |
|-------|---------|
| `**Status:** ❌ Not Started` | `**Status:** Not Started` |
| `**Status:** 🚧 In Progress` | `**Status:** In Progress` |
| Missing `**Version:**` | Add `**Version:** 1.0` |

**Note:** Emoji indicators (🔴, 🟡, 🟢) in the Task Summary **table** are acceptable for quick visual scanning. Only the main `**Status:**` header field must be plain text.

### F2: Required Sections

| Section | Required |
|---------|----------|
| `## Overview` | YES |
| `## Task Summary` | YES |
| `## Dependency Graph` | YES |
| `## Work Streams` | YES |
| `## Timeline Summary` | YES |

---

## Step 4: Run Validation

```bash
echo "=== Import/Path Validation ==="
grep -r "@project/database" .atzentis/specs/P{XX}-{phase-name}/ && echo "❌ Wrong import" || echo "✅ OK"
grep -r "@cyclus/" .atzentis/specs/P{XX}-{phase-name}/ && echo "❌ Wrong import" || echo "✅ OK"
grep -r "@db[^a-z]" .atzentis/specs/P{XX}-{phase-name}/ && echo "⚠️ Check @db imports" || echo "✅ OK"

echo ""
echo "=== Header Validation ==="
for f in $(find .atzentis/specs/P{XX}-{phase-name}/ -name "tasks.md"); do
  echo "--- $f ---"
  grep -q "^\*\*Task ID:\*\*" "$f" && echo "✅ Task ID" || echo "❌ Missing Task ID"
  grep -q "^\*\*Phase:\*\*" "$f" && echo "✅ Phase" || echo "❌ Missing Phase"
  grep -q "^\*\*Total Estimate:\*\*" "$f" && echo "✅ Total Estimate" || echo "❌ Missing"
  grep -q "^\*\*Priority:\*\* P[0-3]" "$f" && echo "✅ Priority format" || echo "❌ Wrong"
done

echo ""
echo "=== Multi-Tenant Section Validation ==="
for f in $(find .atzentis/specs/P{XX}-{phase-name}/ -name "tasks.md"); do
  echo "--- $f ---"
  grep -q "## Multi-Tenant Considerations" "$f" && echo "✅ Multi-Tenant section" || echo "❌ Missing"
  grep -q "## API Key Considerations" "$f" && echo "✅ API Key section" || echo "❌ Missing"
done

echo ""
echo "=== Subtask Format Validation ==="
for f in $(find .atzentis/specs/P{XX}-{phase-name}/ -name "tasks.md"); do
  echo "--- $f ---"
  # Check for wrong subtask format
  grep -q "### S[0-9]:" "$f" && echo "❌ Wrong subtask format (S1:)" || echo "✅ OK"
  # Check for correct format
  grep -q "### T[0-9][0-9]-[0-9][0-9][0-9]\.[0-9]:" "$f" && echo "✅ Correct subtask format" || echo "⚠️ Check format"
done

echo ""
echo "=== Checkbox State Validation ==="
for f in $(find .atzentis/specs/P{XX}-{phase-name}/ -name "tasks.md"); do
  status=$(grep "^\*\*Status:\*\*" "$f" | head -1)
  if echo "$status" | grep -qi "not.started"; then
    checked=$(grep -c "\- \[x\]" "$f" 2>/dev/null || echo 0)
    if [ "$checked" -gt 0 ]; then
      echo "❌ $f: $checked checked boxes in Not Started task"
    else
      echo "✅ $f: All boxes unchecked"
    fi
  fi
done

echo ""
echo "=== Emoji Status Validation ==="
for f in $(find .atzentis/specs/P{XX}-{phase-name}/ -name "*.md"); do
  grep -q "Status:\*\* ❌\|Status:\*\* 🚧\|Status:\*\* ✅" "$f" && echo "❌ $f: Emoji in status" || true
done
```

---

## Step 5: Create Summary

After reviewing all specs, create `.atzentis/specs/P{XX}-{phase-name}/review-report.md`:

```markdown
# Review Summary: Phase P{XX} - {Phase Name}

**Reviewed:** {YYYY-MM-DD}
**Task Breakdown Reviewed:** Yes
**Requirements Reviewed:** Yes
**Tasks Reviewed:** {count}

## Summary

| Category | Issues Found | Fixed |
|----------|--------------|-------|
| Import Paths | {N} | {N} |
| Header Fields | {N} | {N} |
| Required Sections | {N} | {N} |
| Multi-Tenant | {N} | {N} |
| API Key | {N} | {N} |
| Subtask Format | {N} | {N} |
| Checkbox State | {N} | {N} |
| Emoji Status | {N} | {N} |

## Import/Path Fixes

| File | Violation | Fixed |
|------|-----------|-------|
| T07-001/tasks.md | `@db` → `@atzentis/db` | ✅ |

## Header Fixes

| File | Field | Before | After |
|------|-------|--------|-------|
| T07-001/tasks.md | Status | `❌ Not Started` | `Not Started` |

## Missing Sections Added

| File | Section |
|------|---------|
| T07-001/tasks.md | Multi-Tenant Considerations |
| T07-001/tasks.md | API Key Considerations |

## Subtask Format Fixes

| File | Before | After |
|------|--------|-------|
| T07-001/tasks.md | `### S1: Name` | `### T07-001.1: Name` |

## Validation Checklist

### Task Breakdown
- [ ] All header fields present
- [ ] No emoji in status
- [ ] All required sections present

### Requirements
- [ ] All header fields present
- [ ] FR IDs properly formatted
- [ ] User stories present

### Task Files
- [ ] All import paths correct (@atzentis/*)
- [ ] All headers have required fields
- [ ] All subtasks use T{XX}-{NNN}.{N} format
- [ ] Multi-Tenant section present
- [ ] API Key section present
- [ ] No emoji in status fields
- [ ] Checkboxes match status

## Remaining Issues

{List any issues that couldn't be auto-fixed}

---

**Generated by:** /review P{XX}-{phase-name}
```

---

## Output Format

```
═══════════════════════════════════════════════════════════════════
  REVIEW SPECS: P07 - AI Foundation
═══════════════════════════════════════════════════════════════════

Scanning specifications...

Files to review:
  • task-breakdown.md
  • requirements.md
  • T07-001-ai-core-setup/tasks.md
  • T07-002-chat-completion/tasks.md
  • T07-003-streaming/tasks.md
  ...

───────────────────────────────────────────────────────────────────
IMPORT PATH VIOLATIONS
───────────────────────────────────────────────────────────────────

T07-001/tasks.md:
  Line 45: `@db/schema` → `@atzentis/db/schema`
  Line 78: `@ui/shadcn` → `@atzentis/ui-shadcn`

T07-002/tasks.md:
  ✅ No violations

───────────────────────────────────────────────────────────────────
HEADER VIOLATIONS
───────────────────────────────────────────────────────────────────

T07-001/tasks.md:
  ❌ Missing: **Phase:**
  ❌ Wrong: **Status:** ❌ Not Started → **Status:** Not Started

task-breakdown.md:
  ❌ Wrong: **Status:** 🚧 In Progress → **Status:** In Progress

───────────────────────────────────────────────────────────────────
REQUIRED SECTIONS
───────────────────────────────────────────────────────────────────

T07-001/tasks.md:
  ❌ Missing: ## Multi-Tenant Considerations
  ❌ Missing: ## API Key Considerations
  ✅ Present: ## Overview
  ✅ Present: ## Technical Specification

───────────────────────────────────────────────────────────────────
SUBTASK FORMAT
───────────────────────────────────────────────────────────────────

T07-001/tasks.md:
  ❌ Wrong: ### S1: Database Schema → ### T07-001.1: Database Schema
  ❌ Wrong: ### S2: API Endpoints → ### T07-001.2: API Endpoints

T07-002/tasks.md:
  ✅ Correct format

───────────────────────────────────────────────────────────────────
SUMMARY
───────────────────────────────────────────────────────────────────

Files reviewed: 10
Issues found: 12
  • Import paths: 2
  • Header fields: 3
  • Required sections: 4
  • Subtask format: 3

Run `/review P07-ai-foundation --fix` to auto-fix these issues.

═══════════════════════════════════════════════════════════════════
```

---

## Integration with Other Commands

| Command | Relationship |
|---------|-------------|
| `/verify` | /review validates specs, /verify validates implementation |
| `/specify` | /review can fix specs created by /specify |
| `/status` | Run /review before /status to ensure spec format is correct |

### Workflow

```
/specify → tasks.md created
     ↓
/review → Validate spec format, fix issues
     ↓
/implement → Write code
     ↓
/verify → Validate implementation
```

---

## Notes

- Fix ALL violations (import paths, template format, checkbox state)
- Review task-breakdown.md first, then requirements.md, then tasks.md files
- Generate summary report after fixes
- No emoji in status fields (use text: Not Started, In Progress, Complete)
- Subtask format must be `T{XX}-{NNN}.{N}:` not `S{N}:`

---

**Document Version:** 1.0
**Last Updated:** December 2025