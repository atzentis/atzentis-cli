# Generate Phase Requirements (/brainstorm)

Generate a `requirements.md` file from the masterplan phase description. This creates the detailed phase requirements with user stories, functional requirements, and acceptance criteria.

**Confidence Check:** If masterplan phase details are unclear (<70% confidence), ask clarifying questions before generating requirements.md.

## Usage

```
/brainstorm P00
/brainstorm P01-database-auth
/brainstorm P02 --from masterplan.md
```

## Process

When you use this command:

1. **Locate Phase in Masterplan:**
   - Read masterplan from `.atzentis/masterplan.md` (or specified file)
   - Find the phase section (e.g., `### P01: Database & Auth`)
   - Extract phase scope, goals, and deliverables

2. **Gather Context:**
   - Review tech stack from masterplan
   - Check architecture documentation in `.atzentis/docs/`
   - Review related phases for dependencies
   - Identify target users/roles for this phase

3. **Apply Requirements Generation Process:**

   **Step 1: Extract Phase Scope**
   - Phase name and description
   - Duration estimate from masterplan
   - Key deliverables listed
   - Dependencies on previous phases

   **Step 2: Identify User Roles**
   - Who interacts with this phase's features?
   - Tenant Admin, Developer, API Consumer, System
   - Map roles to capabilities

   **Step 3: Generate User Stories**
   - 3-7 user stories per phase
   - Format: "As a {role}, I want {capability}, so that {benefit}"
   - 5-10 acceptance criteria per story
   - Include business rules

   **Step 4: Define Functional Requirements**
   - FR-{AREA}-{NNN} format
   - 5-15 FRs per phase
   - 8-15 acceptance criteria per FR
   - Map to user stories
   - Include dependencies between FRs

   **Step 5: Define Non-Functional Requirements**
   - Multi-tenant isolation using DB-per-tenant (ALWAYS for Atzentis)
   - API key authentication with middleware
   - Performance targets
   - Rate limiting per tenant
   - Security requirements
   - Observability (logging, monitoring)
   - i18n (if applicable)

   **Step 6: Success Metrics**
   - Measurable completion criteria
   - Test coverage targets
   - Performance benchmarks

   **Step 7: Risk Assessment**
   - Technical risks
   - External dependencies
   - Mitigation strategies

4. **Generate requirements.md:**
   - Phase overview and goals
   - User stories with acceptance criteria
   - Functional requirements (FR-XXX-###)
   - Non-functional requirements
   - Success metrics
   - Dependencies and prerequisites
   - Risk assessment
   - Timeline and milestones
   - Definition of done

5. **Create Phase Folder & Save:**
   - Create folder: `.atzentis/specs/P{XX}-{phase-name}/`
   - Save to: `.atzentis/specs/P{XX}-{phase-name}/requirements.md`

## Directory Structure

```
.atzentis/
├── masterplan.md                     # Source of phase descriptions
├── specs/
│   └── P{XX}-{phase-name}/           # Phase folder (created)
│       ├── requirements.md           # Phase requirements (generated)
│       ├── task-breakdown.md         # Created by /plan
│       └── T{XX}-{NNN}-{task-name}/  # Created by /specify
│           └── tasks.md
└── docs/
    ├── tech-stack.md
    ├── api-handlers.md
    ├── frontend.md
    └── templates/
        └── requirements.md           # Template reference
```

## Output Format

```markdown
# Phase {XX}: {Phase Name}

**Version:** 1.0
**Date:** {YYYY-MM-DD}
**Phase Duration:** {X weeks} ({X hours})
**Target:** {Target description}
**Status:** ❌ Not Started

---

## Overview

{2-3 sentence description from masterplan, expanded with technical context}

---

## Implementation Status

**Status:** ❌ Not Started (0% Complete)

**Phase {XX} Scope:**

- {Feature area 1}
- {Feature area 2}
- {Feature area 3}

---

## Goals

- **Goal 1:** {Measurable objective}
- **Goal 2:** {Measurable objective}
- **Goal 3:** {Measurable objective}
- **Goal 4:** {Measurable objective}

---

## User Stories

### Story 1: {Role} {Action}

**As a** {role}
**I want** {capability}
**So that** {benefit}

**Acceptance Criteria:**

- [ ] {Criterion 1}
- [ ] {Criterion 2}
- [ ] {Criterion 3}
- [ ] {Criterion 4}
- [ ] {Criterion 5}

**Business Rules:**

- {Rule 1}
- {Rule 2}

---

### Story 2: {Role} {Action}

{Continue with 3-7 stories}

---

## Functional Requirements

### FR-{AREA}-001: {Requirement Name}

**Priority:** P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low)
**Phase:** {XX}
**Status:** ❌ Not Started

**Description:**

{Clear description of what the system must do}

**Acceptance Criteria:**

- [ ] {Criterion 1}
- [ ] {Criterion 2}
- [ ] {Criterion 3}
- [ ] {8-15 criteria per requirement}

**Dependencies:**

- **Requires:** {FR-XXX-001} or None
- **Enables:** {FR-XXX-003} or None

**Business Rules:**

- {Rule 1}
- {Rule 2}

---

{Continue with 5-15 functional requirements}

---

## Non-Functional Requirements

### NFR-{AREA}-001: Multi-Tenant Isolation

**Priority:** P0 (Critical)
**Status:** ❌ Not Started

**Description:**

All data and operations must be isolated per tenant using **DB-per-tenant architecture**.

**Requirements:**

- [ ] Handlers use `c.get('tenantDb')` for tenant-specific database
- [ ] Services receive `tenantDb` parameter (NOT `tenantId` string)
- [ ] NO `tenantId` filtering in tenant DB queries (DB-level isolation)
- [ ] Meta DB queries use `tenantId` filtering for shared tables
- [ ] Cross-tenant access returns 404 (not 403)
- [ ] List endpoints only return current tenant data (automatic via tenantDb)
- [ ] Unique constraints NOT scoped per tenant (single DB, no tenant column)
- [ ] API keys resolve to correct tenant database via middleware
- [ ] Background jobs include tenant database context
- [ ] File storage prefixed with tenant ID
- [ ] Cache keys prefixed with tenant ID

---

### NFR-{AREA}-002: API Key Authentication

{Standard API key requirements}

---

### NFR-{AREA}-003: Performance

{Performance targets}

---

### NFR-{AREA}-004: Rate Limiting

{Rate limit requirements by plan tier}

---

### NFR-{AREA}-005: Security

{Security requirements}

---

### NFR-{AREA}-006: Observability

{Logging and monitoring requirements}

---

## Success Metrics

**Phase {XX} is successful when:**

- [ ] {Metric 1}
- [ ] {Metric 2}
- [ ] {Metric 3}
- [ ] {Metric 4}

---

## Out of Scope

**What is explicitly NOT included in Phase {XX}:**

- {Feature 1}
- {Feature 2}
- {Deferred: "X - moved to Phase {Y}"}

---

## Dependencies & Prerequisites

### Technical Dependencies

**Requires (must be complete before starting):**

- [ ] {Phase X: Description}
- [ ] {Infrastructure: Description}

### External Dependencies

**Requires (may block progress):**

- [ ] {Third-party: Description}

---

## Risks & Mitigation

### High Risk Items

**Risk 1: {Description}**

- **Impact:** High | Medium | Low
- **Probability:** High | Medium | Low
- **Mitigation:** {Strategy}

---

## Timeline & Milestones

### Week 1: {Milestone Name}

**Focus:** {Description}

**Deliverables:**

- [ ] {Deliverable 1}
- [ ] {Deliverable 2}

---

## Definition of Done

**Phase {XX} is complete when:**

- [ ] All functional requirements implemented
- [ ] All user stories verified
- [ ] Code follows Atzentis standards
- [ ] All tests passing (80%+ unit, 70%+ integration)
- [ ] Multi-tenant isolation verified
- [ ] API documentation updated
- [ ] Deployed to staging
- [ ] Smoke tested

---

## References

**Architecture:**

- Tech Stack: `.atzentis/docs/tech-stack.md`
- API Handlers: `.atzentis/docs/api-handlers.md`
- Frontend: `.atzentis/docs/frontend.md`

**Templates:**

- Requirements: `.atzentis/docs/templates/requirements.md`
- Task Breakdown: `.atzentis/docs/templates/task-breakdown.md`

**Related Phases:**

- Previous: `P{XX-1}`
- Next: `P{XX+1}`

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| {Date} | Initial creation | {Name} |

---

**Created:** {YYYY-MM-DD}
**Last Updated:** {YYYY-MM-DD}
```

## Requirement Area Codes

| Area Code | Domain | Examples |
|-----------|--------|----------|
| **AUTH** | Authentication | API keys, sessions, OAuth |
| **WS** | Workspaces | Workspace CRUD, settings |
| **PHASE** | Phases | Phase management |
| **TASK** | Tasks | Task CRUD, subtasks |
| **DB** | Database | Schema, migrations, multi-tenant |
| **AI** | AI Services | Chat, RAG, agents |
| **TEST** | Testing | Test runs, behavior view |
| **BILL** | Billing | Plans, usage, invoices |
| **INT** | Integrations | GitHub, Linear |
| **UI** | User Interface | Components, layouts |

## Examples

### Example 1: Basic Phase

**Input:**
```
/requirements P01
```

**Process:**
1. Reads masterplan, finds `### P01: Database & Auth`
2. Extracts scope: Meta DB, tenant DB, Better Auth, API keys
3. Identifies roles: Tenant Admin, Developer, System
4. Generates 5 user stories, 12 functional requirements
5. Creates folder and requirements file

**Output:**
- `.atzentis/specs/P01-database-auth/requirements.md`

### Example 2: With Phase Name

**Input:**
```
/requirements P02-studio-core
```

**Process:**
1. Reads masterplan, finds `### P02: Studio Core`
2. Extracts scope: Workspaces, phases, tasks, Kanban
3. Generates requirements with FSD frontend patterns
4. Includes multi-tenant workspace isolation

**Output:**
- `.atzentis/specs/P02-studio-core/requirements.md`

### Example 3: Custom Masterplan

**Input:**
```
/requirements P00 --from docs/masterplan-v2.md
```

**Process:**
1. Reads specified masterplan file
2. Finds P00 section
3. Generates requirements

**Output:**
- `.atzentis/specs/P00-foundation-setup/requirements.md`

## Workflow Integration

```
Masterplan (WHAT)
       │
       ▼
/brainstorm P01  ──► requirements.md (Detailed WHAT)
       │
       ▼
/plan P01          ──► task-breakdown.md (Task overview)
       │
       ▼
/specify T01-001   ──► tasks.md (Detailed HOW)
```

## Notes

- Always reads from masterplan as source of truth
- Expands masterplan scope into detailed requirements
- Applies Atzentis patterns (multi-tenant, API keys, Clean Architecture)
- Creates phase folder if it doesn't exist
- Can update existing requirements.md (preserves completed items)
- Phase names derived from masterplan section titles
- Duration estimates from masterplan or calculated from scope