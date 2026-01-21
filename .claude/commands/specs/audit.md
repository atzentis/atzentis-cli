---
allowed-tools: Read, Write, Glob, Grep
description: Validate cross-file coverage and consistency (FR → Task → Test mapping)
---

# Cross-Phase Consistency Audit (/audit)

**Version:** 1.0
**Date:** December 2025
**Purpose:** Validate cross-file coverage and consistency (FR → Task → Test mapping)

Performs a comprehensive audit of phase documentation - ensures all functional requirements, tasks, and tests are aligned. Detects missing mappings, coverage gaps, and inconsistencies.

**Note:** This is different from `/review` which validates spec **format**. `/audit` validates **coverage and traceability**.

---

## Usage

```bash
/audit P07-ai-foundation
/audit P07-ai-foundation --report
/audit P07-ai-foundation --strict
/audit P07-ai-foundation --fix
```

### Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--report` | Generate detailed audit-report.md | false |
| `--strict` | Fail on any missing mapping | false |
| `--fix` | Attempt to add missing mappings | false |
| `--verbose` | Show all checks, not just failures | false |

---

## What /audit Checks

| Check | Source | Target | Required |
|-------|--------|--------|----------|
| FR → Task | requirements.md | task-breakdown.md | ✅ |
| Task → Test | task-breakdown.md | test-plan.md | ✅ |
| FR → Test | requirements.md | test-plan.md | ✅ |
| Dependencies | task-breakdown.md | task-breakdown.md | ✅ |
| Multi-tenant mentions | requirements.md | All specs | ✅ |
| API key mentions | requirements.md | All specs | ✅ |

---

## Process

### Step 1: Locate Phase Context

```
Input: P07-ai-foundation

Load files:
  .atzentis/specs/P07-ai-foundation/requirements.md
  .atzentis/specs/P07-ai-foundation/task-breakdown.md
  .atzentis/specs/P07-ai-foundation/test-plan.md
  .atzentis/specs/P07-ai-foundation/T07-*/tasks.md (all task files)
```

### Step 2: Extract and Normalize Data

**From requirements.md:**
```
Functional Requirements: FR-AI-001, FR-AI-002, ... FR-AI-015
User Stories: Story 1, Story 2, ... Story 8
Business Rules: BR-001, BR-002, ...
```

**From task-breakdown.md:**
```
Tasks: T07-001, T07-002, ... T07-008
Dependencies: T07-002 → T07-001, T07-003 → T07-001, ...
FR Mappings: T07-001 covers FR-AI-001, FR-AI-002
```

**From test-plan.md:**
```
Test Mappings: FR-AI-001 → unit/ai/core.test.ts
Test Categories: Unit, Integration, E2E, Multi-tenant
```

**From tasks.md files:**
```
Subtasks: T07-001.1, T07-001.2, ...
Acceptance Criteria per subtask
Testing section per subtask
```

### Step 3: Cross-Check FR → Task Coverage

For each FR in requirements.md:
- Check if FR appears in task-breakdown.md
- Check if FR is mapped to at least one task
- Flag unmapped FRs

```typescript
interface FRCoverage {
  frId: string;
  description: string;
  mappedTasks: string[];      // T07-001, T07-002
  status: 'covered' | 'partial' | 'missing';
}
```

### Step 4: Cross-Check Task → Test Coverage

For each task in task-breakdown.md:
- Check if task appears in test-plan.md
- Check if task has test cases defined
- Flag untested tasks

```typescript
interface TaskTestCoverage {
  taskId: string;
  taskName: string;
  testFiles: string[];        // unit/ai/core.test.ts
  testTypes: string[];        // Unit, Integration
  status: 'tested' | 'partial' | 'untested';
}
```

### Step 5: Cross-Check FR → Test Coverage

For each FR:
- Trace FR → Task → Test
- Verify complete chain exists
- Flag broken chains

```typescript
interface FRTestChain {
  frId: string;
  tasks: string[];
  tests: string[];
  chainComplete: boolean;
}
```

### Step 6: Dependency Verification

Check task-breakdown.md for:
- Missing dependencies (task references non-existent task)
- Circular dependencies (T07-001 → T07-002 → T07-001)
- Orphan tasks (no dependencies and not depended on)

### Step 7: Multi-Tenant and API Key Coverage

For phases with multi-tenant requirements:
- Check if multi-tenant is mentioned in requirements
- Verify multi-tenant section exists in tasks.md
- Check for multi-tenant test cases in test-plan.md

Same for API key requirements.

### Step 8: Generate Audit Report

Produce summary with pass/fail status and recommendations.

### Step 9: Update meta.json

If meta.json exists, update coverage fields:

```json
{
  "coverage": {
    "frToTask": 87,
    "taskToTest": 75,
    "overall": 85,
    "lastAudited": "2025-12-21T16:00:00Z"
  }
}
```

This enables the specs browser to show coverage badges.

---

## Output Format

```
═══════════════════════════════════════════════════════════════════
  AUDIT: P07 - AI Foundation
═══════════════════════════════════════════════════════════════════

Auditing cross-file consistency...

───────────────────────────────────────────────────────────────────
FR → TASK COVERAGE
───────────────────────────────────────────────────────────────────

  ✅ 13/15 FRs mapped to tasks (87%)

  Unmapped FRs:
    ❌ FR-AI-011: Semantic caching for repeated queries
    ❌ FR-AI-015: Cost alerting when budget exceeded

───────────────────────────────────────────────────────────────────
TASK → TEST COVERAGE
───────────────────────────────────────────────────────────────────

  ✅ 6/8 tasks have test coverage (75%)

  Untested Tasks:
    ⚠️ T07-004: Cost Tracking (no unit tests defined)
    ⚠️ T07-007: Semantic Caching (no integration tests)

───────────────────────────────────────────────────────────────────
FR → TEST CHAIN
───────────────────────────────────────────────────────────────────

  ✅ 11/15 FRs have complete test chains (73%)

  Broken Chains:
    ❌ FR-AI-004 → T07-003 → ??? (no test mapping)
    ❌ FR-AI-011 → ??? → ??? (not mapped to task)
    ❌ FR-AI-015 → ??? → ??? (not mapped to task)

───────────────────────────────────────────────────────────────────
DEPENDENCY VERIFICATION
───────────────────────────────────────────────────────────────────

  ✅ No circular dependencies
  ✅ All dependency references valid
  ⚠️ 1 orphan task: T07-006 (no dependencies, not blocking)

───────────────────────────────────────────────────────────────────
MULTI-TENANT COVERAGE
───────────────────────────────────────────────────────────────────

  ✅ Multi-tenant mentioned in requirements
  ✅ 8/8 tasks have Multi-Tenant Considerations section
  ✅ Multi-tenant tests defined in test-plan.md

───────────────────────────────────────────────────────────────────
API KEY COVERAGE
───────────────────────────────────────────────────────────────────

  ✅ API key auth mentioned in requirements
  ✅ 8/8 tasks have API Key Considerations section
  ⚠️ API key tests missing for 2 endpoints

───────────────────────────────────────────────────────────────────
SUMMARY
───────────────────────────────────────────────────────────────────

| Category | Status | Coverage |
|----------|--------|----------|
| FR → Task | ⚠️ Partial | 87% (13/15) |
| Task → Test | ⚠️ Partial | 75% (6/8) |
| FR → Test Chain | ⚠️ Partial | 73% (11/15) |
| Dependencies | ✅ Pass | 100% |
| Multi-Tenant | ✅ Pass | 100% |
| API Key | ⚠️ Partial | 75% |

Overall Coverage: 85%
Audit Result: ⚠️ PARTIAL COVERAGE

───────────────────────────────────────────────────────────────────
RECOMMENDATIONS
───────────────────────────────────────────────────────────────────

1. Add task for FR-AI-011 (Semantic caching)
   → /specify P07-ai-foundation/requirements.md FR-AI-011

2. Add task for FR-AI-015 (Cost alerting)
   → /specify P07-ai-foundation/requirements.md FR-AI-015

3. Add test mappings for T07-004 and T07-007
   → Update test-plan.md or run /tests P07-ai-foundation --force

4. Add API key tests for missing endpoints
   → Check test-plan.md API Key section

5. Re-run audit after fixes:
   → /audit P07-ai-foundation

═══════════════════════════════════════════════════════════════════
```

---

## Audit Report Format (--report)

**File:** `.atzentis/specs/P07-ai-foundation/audit-report.md`

```markdown
# Audit Report: P07 - AI Foundation

**Generated:** 2025-12-21T15:30:00Z
**Phase:** P07-ai-foundation
**Audited Files:** requirements.md, task-breakdown.md, test-plan.md, 8 tasks.md
**Overall Coverage:** 85%

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Functional Requirements | 15 |
| Tasks | 8 |
| Test Mappings | 42 |
| Coverage Score | 85% |
| Audit Result | ⚠️ Partial Coverage |

---

## FR → Task Mapping

| FR ID | Description | Mapped Tasks | Status |
|-------|-------------|--------------|--------|
| FR-AI-001 | Provider abstraction | T07-001 | ✅ |
| FR-AI-002 | Chat completion API | T07-002 | ✅ |
| FR-AI-003 | Streaming responses | T07-003 | ✅ |
| FR-AI-004 | Token counting | T07-003 | ✅ |
| ... | ... | ... | ... |
| FR-AI-011 | Semantic caching | — | ❌ Missing |
| FR-AI-015 | Cost alerting | — | ❌ Missing |

**Coverage:** 13/15 (87%)

---

## Task → Test Mapping

| Task ID | Task Name | Test Files | Test Types | Status |
|---------|-----------|------------|------------|--------|
| T07-001 | AI Core Setup | core.test.ts | Unit, Integration | ✅ |
| T07-002 | Chat Completion | chat.test.ts | Unit, Integration, E2E | ✅ |
| T07-003 | Streaming | stream.test.ts | Unit, Integration | ✅ |
| T07-004 | Cost Tracking | — | — | ⚠️ Untested |
| ... | ... | ... | ... | ... |

**Coverage:** 6/8 (75%)

---

## Dependency Graph Validation

```
T07-001 (AI Core)
    ↓
T07-002 (Chat) ──→ T07-003 (Streaming)
    ↓
T07-004 (Cost) ──→ T07-005 (Rate Limit)
    ↓
T07-006 (Cache) ← Orphan (no dependencies)
    ↓
T07-007 (Semantic Cache) ──→ T07-008 (Testing)
```

**Issues:**
- T07-006 is orphan (not blocking, but review if intentional)

---

## Multi-Tenant Audit

| Check | Status | Notes |
|-------|--------|-------|
| Mentioned in requirements | ✅ | FR-AI-002, FR-AI-004 |
| Tasks have section | ✅ | 8/8 tasks |
| Tests defined | ✅ | 12 multi-tenant tests |
| Isolation patterns | ✅ | tenantId in all queries |

---

## API Key Audit

| Check | Status | Notes |
|-------|--------|-------|
| Mentioned in requirements | ✅ | FR-AI-001 |
| Tasks have section | ✅ | 8/8 tasks |
| Tests defined | ⚠️ | 6/8 endpoints covered |
| Missing coverage | ⚠️ | /v1/usage, /v1/cache |

---

## Remediation Plan

| Priority | Action | Command |
|----------|--------|---------|
| P0 | Map FR-AI-011 to task | `/specify ... FR-AI-011` |
| P0 | Map FR-AI-015 to task | `/specify ... FR-AI-015` |
| P1 | Add tests for T07-004 | Update test-plan.md |
| P1 | Add tests for T07-007 | Update test-plan.md |
| P2 | Add API key tests | Update test-plan.md |
| P2 | Review T07-006 orphan status | Manual review |

---

## Next Steps

1. Fix P0 issues (unmapped FRs)
2. Fix P1 issues (untested tasks)
3. Re-run: `/audit P07-ai-foundation`
4. Target: 95%+ coverage before implementation

---

**Generated by:** /audit command
**Date:** 2025-12-21
```

---

## Strict Mode (--strict)

With `--strict`, audit fails on ANY missing mapping:

```bash
/audit P07-ai-foundation --strict
```

```
❌ AUDIT FAILED (Strict Mode)

Blocking Issues:
  - FR-AI-011: Not mapped to any task
  - FR-AI-015: Not mapped to any task
  - T07-004: No test coverage
  - T07-007: No test coverage

Fix all issues before proceeding with implementation.

Exit code: 1
```

Useful for CI/CD gates.

---

## Fix Mode (--fix)

With `--fix`, attempt to add missing mappings:

```bash
/audit P07-ai-foundation --fix
```

```
Attempting to fix missing mappings...

FR → Task:
  ✅ FR-AI-011: Added to T07-007 (Semantic Caching)
  ⚠️ FR-AI-015: No suitable task found (manual review needed)

Task → Test:
  ✅ T07-004: Added test mapping to test-plan.md
  ✅ T07-007: Added test mapping to test-plan.md

Files modified:
  - task-breakdown.md (1 FR mapping added)
  - test-plan.md (2 test mappings added)

Re-run /audit to verify fixes.
```

---

## Comparison: /audit vs /review

| Aspect | /audit | /review |
|--------|--------|---------|
| **Purpose** | Coverage validation | Format validation |
| **Checks** | FR → Task → Test chains | Headers, sections, patterns |
| **Input** | Cross-file analysis | Per-file analysis |
| **Output** | Coverage report | Format violations |
| **When to use** | After /sync, before /implement | After /specify |

### Recommended Order

```
/sync           → Generate phase artifacts
/audit          → Validate coverage (FR → Task → Test)
/specify --all  → Generate tasks.md files
/review         → Validate spec format
/implement      → Build features
/verify         → Validate implementation
```

---

## Integration with Other Commands

| Command | Relationship |
|---------|-------------|
| `/sync` | Run /audit AFTER /sync to validate coverage |
| `/specify` | /audit checks if tasks cover all FRs |
| `/tests` | /audit validates test mappings from test-plan.md |
| `/review` | /review validates format, /audit validates coverage |
| `/verify` | /verify checks code, /audit checks specs |

---

## CI Integration

```yaml
# .github/workflows/audit.yml
- name: Audit phase coverage
  run: |
    # Strict mode for PR checks
    /audit P07-ai-foundation --strict --report
    
    # Upload report as artifact
    - uses: actions/upload-artifact@v3
      with:
        name: audit-report
        path: .atzentis/specs/P07-ai-foundation/audit-report.md
```

---

## Notes

- Run `/audit` after `/sync` to validate phase setup
- Run `/audit` before `/implement` to ensure coverage
- Use `--strict` in CI/CD to enforce quality gates
- Use `--fix` for quick remediation of simple gaps
- 95%+ coverage recommended before implementation
- Multi-tenant and API key coverage is REQUIRED for Atzentis

---

**Document Version:** 1.0
**Last Updated:** December 2025