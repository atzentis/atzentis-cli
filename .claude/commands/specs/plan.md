# Generate Task Breakdown (/plan)

Generate a `task-breakdown.md` file from phase requirements file. This creates the phase-level task overview with dependencies and architecture decisions.

**Confidence Check:** If requirements are unclear while planning (<70% confidence), ask clarifying questions before generating task-breakdown.md.

## Usage

```
/plan P00-foundation-setup
/plan P00-foundation-setup/requirements.md
/plan T00-001-monorepo-init
```

## Process

When you use this command:

1. **Locate Requirements File:**
   - If phase folder provided (e.g., `P00-foundation-setup`): Read `requirements.md` from `.atzentis/specs/P00-foundation-setup/`
   - If requirements file provided: Read that file directly
   - If task ID provided (e.g., `T00-001-monorepo-init`): Extract phase prefix (`T00` → `P00`) and locate phase folder

2. **Read Requirements:**
   - Parse requirements file for functional requirements
   - Extract user stories
   - Extract functional requirements (FR-XXX-###)
   - Identify dependencies between requirements
   - Extract business rules and constraints

3. **Analyze Technical Context:**
   - Reference existing architecture guides in `.atzentis/docs/`
   - Check existing codebase patterns
   - Review related tasks in the same phase
   - Review existing `task-breakdown.md` if it exists

4. **Apply 7-Step Process to Group Tasks:**

   **Step 1: Extract Input Data**
   - Extract User Stories from requirements file
   - Extract Backend Resource Groups
   - Extract Functional Requirements
   - Count and summarize all inputs

   **Step 2: Identify Domains**
   - Organize by User Role (Admin, User, Customer, etc.)
   - Organize by Backend Resource (Products, Orders, Users, etc.)
   - Organize by Workflow (Checkout, Onboarding, etc.)
   - Identify logical groupings

   **Step 3: Apply Constraints**
   - Total hours constraint (from requirements or estimate)
   - Task size constraint (12-32 hours for sprint-sized tasks)
   - Minimal component overlap requirement
   - Parallel opportunities identification

   **Step 4: Test Alternatives**
   - Try different task groupings (6 tasks vs 8 tasks vs 10 tasks)
   - Evaluate each alternative using key decision factors
   - Select optimal grouping (usually 6-10 tasks)

   **Step 5: Validate Coverage**
   - Verify all User Stories mapped to tasks
   - Verify all Backend Resources covered
   - Verify all Functional Requirements satisfied
   - Document mapping (e.g., "Stories 1-3 → Task 001")

   **Step 6: Size Estimation**
   - Estimate each task (12-32 hours)
   - Verify total matches constraint
   - Adjust if needed

   **Step 7: Create Task Summary**
   - Create task summary table with task IDs, names, estimates, priorities, dependencies
   - Identify parallel execution opportunities
   - Document high-level architecture decisions

5. **Generate task-breakdown.md:**
   - Phase overview and goals
   - Task summary table
   - Task dependencies graph
   - High-level architecture decisions
   - Phase-level estimates and timeline
   - Parallel execution groups
   - Integration points
   - Security considerations
   - Performance considerations
   - Testing strategy

6. **Save File:**
   - Save to `.atzentis/specs/P{XX}-{phase-name}/task-breakdown.md`
   - If file exists, update it (merge new tasks with existing ones)

## Directory Structure

```
.atzentis/
├── specs/
│   └── P{XX}-{phase-name}/           # Phase folder
│       ├── requirements.md           # Phase requirements (input)
│       ├── task-breakdown.md         # Phase overview (generated)
│       └── T{XX}-{NNN}-{task-name}/  # Task folders
│           └── tasks.md              # Task details
├── docs/
│   ├── tech-stack.md                 # Technology choices
│   └── architecture/                 # Architecture guides
└── commands/
    └── *.md                          # Command definitions
```

## Output Format

```markdown
# Phase {XX}: {Phase Name} - Task Breakdown

**Version:** 1.0
**Date:** {YYYY-MM-DD}
**Total Tasks:** {X}
**Total Estimate:** {X hours} ({Y working days} with {Z developers})
**Status:** ❌ Not Started | 🚧 In Progress | ✅ Complete

## Overview

{2-3 sentences describing the phase}

## Task Summary

| Task ID | Task Name | Hours | Priority | Dependencies | Status |
|---------|-----------|-------|----------|--------------|--------|
| T00-001 | Monorepo Init | 8h | P0 | None | ❌ Not Started |
| T00-002 | API Shell | 6h | P0 | T00-001 | ❌ Not Started |

## Dependency Graph

```
T00-001 ──► T00-002 ──► T00-003
    │
    └──► T00-004 [P] ──► T00-005
```

## Critical Path Analysis

**Critical Path:** T00-001 → T00-002 → T00-003 → T00-006
**Total Time:** 32 hours

## Implementation Tracks

- **Backend Track:** T00-001 → T00-002 → T00-003
- **Frontend Track:** T00-004 → T00-005 → T00-006

## Parallel Execution Strategy

- **Wave 1:** T00-001 (foundation, blocks all)
- **Wave 2:** T00-002 [P], T00-004 [P] (can run in parallel)
- **Wave 3:** T00-003, T00-005
- **Wave 4:** T00-006 (integration, needs both tracks)

## Architecture Decisions

- **Decision 1:** {Description}
  - Rationale: {Why}
  - Alternatives Considered: {What else}

## Testing Strategy

- **Unit Tests:** Each module has isolated tests
- **Integration Tests:** API endpoint tests
- **E2E Tests:** Critical user flows

## References

- Requirements: `.atzentis/specs/P{XX}-{phase-name}/requirements.md`
- Tech Stack: `.atzentis/docs/tech-stack.md`

## Change Log

| Date | Change | Author |
|------|--------|--------|
| {YYYY-MM-DD} | Initial creation | {Author} |

---

**Created:** {YYYY-MM-DD}
**Last Updated:** {YYYY-MM-DD}
```

## Path Resolution

### Phase Folder Path Format

```
.atzentis/specs/P{XX}-{phase-name}/
```

**Examples:**
- Phase 0: `.atzentis/specs/P00-foundation-setup/`
- Phase 1: `.atzentis/specs/P01-authentication/`
- Phase 13: `.atzentis/specs/P13-advanced-features/`

### Extracting Phase from Task ID

When given a task ID like `T00-001-monorepo-init`:
1. Extract phase prefix: `T00` → `P00`
2. Find matching phase folder: `P00-*` in `.atzentis/specs/`
3. Result: `.atzentis/specs/P00-foundation-setup/`

## Examples

### Example 1: From Phase Folder

**Input:**
```
/plan P00-foundation-setup
```

**Process:**
1. Locates `.atzentis/specs/P00-foundation-setup/`
2. Reads `requirements.md` from that folder
3. Analyzes requirements and groups into tasks
4. Generates `task-breakdown.md` in same folder

**Output:**
- `.atzentis/specs/P00-foundation-setup/task-breakdown.md`

### Example 2: From Requirements File

**Input:**
```
/plan P00-foundation-setup/requirements.md
```

**Process:**
1. Reads specified requirements file
2. Extracts phase from path: `P00-foundation-setup`
3. Generates task breakdown

**Output:**
- `.atzentis/specs/P00-foundation-setup/task-breakdown.md`

### Example 3: From Task ID

**Input:**
```
/plan T00-001-monorepo-init
```

**Process:**
1. Extracts phase: `T00` → `P00`
2. Finds phase folder: `P00-foundation-setup`
3. Reads requirements from that folder
4. Updates or creates task breakdown

**Output:**
- `.atzentis/specs/P00-foundation-setup/task-breakdown.md`

## Notes

- This creates phase-level overview (not individual task details)
- Task breakdown includes high-level architecture decisions
- References existing patterns and guides in `.atzentis/docs/`
- Specifies task dependencies and parallel opportunities
- Can update existing `task-breakdown.md` (merges new tasks with existing)
- Phase folders use format `P{XX}-{kebab-case-name}`
- Task folders use format `T{XX}-{NNN}-{kebab-case-name}`