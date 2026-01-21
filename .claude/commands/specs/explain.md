# Explain Requirements or Task (/explain)

Explains the structure, intent, and dependencies of a phase, requirements file, or task. Summarizes purpose, stakeholders, architecture context, and design implications.

**Confidence Check:** If unclear (<80%), ask clarifying questions before proceeding.

## Usage

```bash
/explain P01-database-auth
/explain P01-database-auth/requirements.md
/explain T01-003-api-keys
/explain .atzentis/specs/P07-ai-foundation/
```

## Process

### 1. Identify Context

- Detect if input is a requirements file, task folder, or phase folder
- Extract metadata (phase ID, task ID, names, etc.)
- Load related files (task-breakdown.md, masterplan.md)

```
If phase folder (P01-database-auth):
  → Read .atzentis/specs/P01-database-auth/requirements.md
  → Read .atzentis/specs/P01-database-auth/task-breakdown.md
  → Cross-reference with masterplan.md

If task folder (T01-003-api-keys):
  → Read .atzentis/specs/P01-database-auth/T01-003-api-keys/tasks.md
  → Read parent phase requirements
  → Identify dependencies and blockers

If requirements file:
  → Read the file directly
  → Extract FRs, user stories, acceptance criteria
```

### 2. Parse Source File

- Extract user stories and functional requirements (FRs)
- Extract acceptance criteria
- Identify related tasks or dependencies
- Read architecture references (tech-stack.md, architecture.md)

### 3. Analyze Content

- Summarize purpose and goals
- Highlight key business rules
- Identify multi-tenant implications
- Identify AI services involved (if applicable)
- Map API endpoints affected
- Map SDK methods impacted

### 4. Generate Explanation

Output structured explanation to console (or file with `--save` flag)

---

## Output Format

```markdown
# Explanation: {Phase or Task ID} - {Name}

**File:** {input_path}
**Type:** Phase | Task
**Generated:** {YYYY-MM-DD}

---

## Overview

{High-level summary of what this requirement or task covers. 2-3 sentences explaining the "what" and "why".}

---

## Phase Context

**Phase:** P{XX} - {Phase Name}
**Layer:** {Foundation | Specs & Integration | Testing | AI Foundation | TaskBuilder | AI Services | Platform}
**From Masterplan:** {Brief description from masterplan.md}

### Phase Dependencies
- **Requires:** P{XX} ({name}), P{YY} ({name})
- **Enables:** P{XX} ({name}), P{YY} ({name})
- **Parallel With:** P{XX} ({name}) - if applicable

---

## Purpose

### Business Rationale
{Why this work is needed from a business perspective}

### Technical Rationale
{Why this work is needed from a technical perspective}

### Success Criteria
- {Criterion 1}
- {Criterion 2}
- {Criterion 3}

---

## Functional Scope

### Covers
| FR ID | Description | Priority |
|-------|-------------|----------|
| FR-{AREA}-001 | {Description} | P0 |
| FR-{AREA}-002 | {Description} | P1 |

### User Stories
| Story | As a... | I want to... | So that... |
|-------|---------|--------------|------------|
| US-001 | {Role} | {Action} | {Benefit} |

### Excludes
- {What is explicitly out of scope}
- {Deferred to future phase}

---

## Multi-Tenant Context

### Tenant Isolation
- **Database:** {How data is isolated - separate DB, tenant_id column, etc.}
- **API Access:** {How API keys scope to tenant}
- **Data Visibility:** {What data is tenant-specific vs shared}

### Tenant-Specific Features
- {Feature 1}: {How it varies per tenant}
- {Feature 2}: {How it varies per tenant}

### Cross-Tenant Considerations
- {Any shared resources or considerations}

---

## AI Services Context (if applicable)

### Services Involved
| Service | Purpose | Provider |
|---------|---------|----------|
| Chat | {Purpose} | OpenAI/Anthropic |
| Embeddings | {Purpose} | OpenAI |
| OCR | {Purpose} | Mistral |

### AI-Specific Concerns
- **Rate Limiting:** {Per-tenant limits}
- **Cost Tracking:** {How costs are attributed}
- **Caching:** {Semantic caching strategy}
- **Fallback:** {Provider fallback strategy}

---

## API Impact

### New Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /v1/{resource} | {Description} |
| GET | /v1/{resource} | {Description} |

### Modified Endpoints
| Method | Path | Change |
|--------|------|--------|
| PATCH | /v1/{resource}/:id | {What changed} |

### SDK Methods
| Method | Description |
|--------|-------------|
| `atzentis.{service}.{method}()` | {Description} |

---

## Dependencies

### Upstream (Requires)
| Dependency | Type | Status | Notes |
|------------|------|--------|-------|
| P{XX}-{name} | Phase | ✅ Complete | {Notes} |
| T{XX}-{NNN} | Task | 🔄 In Progress | {Notes} |
| {External Service} | External | ✅ Available | {Notes} |

### Downstream (Enables)
| Dependent | Type | Impact |
|-----------|------|--------|
| P{XX}-{name} | Phase | {How it depends on this} |
| T{XX}-{NNN} | Task | {How it depends on this} |

### External Dependencies
| System | Purpose | Integration Point |
|--------|---------|-------------------|
| {Service} | {Purpose} | {API/Webhook/etc.} |

---

## Architecture Context

### Components Affected

```
apps/
├── api/                    # {Changes to API}
│   └── src/modules/{domain}/
├── studio/                 # {Changes to Studio}
│   └── src/app/{feature}/
└── docs/                   # {Documentation updates}

packages/
├── db/                     # {Schema changes}
└── auth/                   # {Auth changes}

services/
└── ai-{service}/           # {AI service changes}
```

### Design Patterns Used
- **Pattern 1:** {Description and why}
- **Pattern 2:** {Description and why}

### Key Technical Decisions
| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| {Decision 1} | {Why} | {What else was considered} |

---

## Business Rules

| Rule | Description | Enforcement |
|------|-------------|-------------|
| BR-001 | {Rule description} | {Where enforced - API, DB, UI} |
| BR-002 | {Rule description} | {Where enforced} |

### Edge Cases
| Case | Expected Behavior | Notes |
|------|-------------------|-------|
| {Edge case 1} | {Behavior} | {Notes} |
| {Edge case 2} | {Behavior} | {Notes} |

---

## Risks and Constraints

### Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| {Risk 1} | High | Medium | {Mitigation strategy} |
| {Risk 2} | Medium | Low | {Mitigation strategy} |

### Constraints
| Constraint | Description | Impact |
|------------|-------------|--------|
| {Constraint 1} | {Description} | {How it affects implementation} |
| {Constraint 2} | {Description} | {How it affects implementation} |

### Assumptions
- {Assumption 1}
- {Assumption 2}

---

## Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | {Question needing clarification} | {Who should answer} | ❓ Open |
| 2 | {Question needing clarification} | {Who should answer} | ✅ Resolved |

---

## Related Commands

```bash
# View task breakdown for this phase
/plan P{XX}-{phase-name}

# Generate test plan
/tests P{XX}-{phase-name}

# Start implementation
/implement T{XX}-{NNN}-{task-name}

# Check status
/status P{XX}-{phase-name}
```

---

## Summary

> **{Phase/Task ID}** {provides/implements/enables} {key capability} by {main approach/implementation}. 
> It is {critical/important/helpful} for {business goal} and {depends on/enables} {related phases/features}.

---

## References

- **Requirements:** `.atzentis/specs/P{XX}-{phase-name}/requirements.md`
- **Task Breakdown:** `.atzentis/specs/P{XX}-{phase-name}/task-breakdown.md`
- **Masterplan:** `masterplan.md`
- **Tech Stack:** `.atzentis/docs/tech-stack.md`
- **Architecture:** `.atzentis/docs/architecture.md`
```

---

## Examples

### Example 1: Explain a Phase

```bash
/explain P07-ai-foundation
```

**Output highlights:**
- Phase Context: AI Foundation Layer, enables P09 TaskBuilder
- AI Services: Lists all AI packages being created
- Multi-Tenant: Per-tenant rate limits, cost tracking
- API Impact: New `/v1/chat`, `/v1/embeddings` endpoints

### Example 2: Explain a Task

```bash
/explain T01-003-api-keys
```

**Output highlights:**
- Purpose: API key management for tenant authentication
- Scope: CRUD for API keys, scope validation, rate limiting
- Dependencies: Requires T01-001 (tenant schema)
- Business Rules: Key format, scope inheritance, rotation policy

### Example 3: Explain Requirements File

```bash
/explain P02-client-core/requirements.md
```

**Output highlights:**
- All FRs and user stories extracted
- Mapped to planned tasks
- Architecture implications for Studio app
- Open questions flagged

---

## Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--save` | Save output to file | `/explain P07 --save` |
| `--brief` | Short summary only | `/explain T01-003 --brief` |
| `--json` | Output as JSON | `/explain P07 --json` |

### Save Location

When using `--save`:
```
.atzentis/specs/P{XX}-{phase-name}/EXPLAIN.md
.atzentis/specs/P{XX}-{phase-name}/T{XX}-{NNN}-{name}/EXPLAIN.md
```

---

## Notes

- Designed to help onboard new engineers quickly
- Useful for documentation generation or technical review prep
- Cross-references masterplan.md for phase context
- Identifies multi-tenant and AI service implications
- Can be combined with `/plan`, `/tests`, `/implement` for full workflow
- Default output is console; use `--save` to persist

---

## When to Use

| Scenario | Command |
|----------|---------|
| New to a phase, need overview | `/explain P{XX}-{name}` |
| Starting a task, need context | `/explain T{XX}-{NNN}` |
| Reviewing requirements before planning | `/explain {phase}/requirements.md` |
| Onboarding new team member | `/explain P{XX} --save` (create docs) |
| Technical review preparation | `/explain P{XX}` |
| Understanding dependencies | `/explain T{XX}-{NNN}` |

---

**Document Version:** 1.0
**Last Updated:** December 2025