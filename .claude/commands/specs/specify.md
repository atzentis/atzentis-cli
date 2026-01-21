# Generate Tasks from Requirements (/specify)

**Version:** 1.1
**Date:** December 2025
**Purpose:** Generate `tasks.md` files from phase requirements

Generate detailed task specifications from phase requirements files. This creates task breakdowns directly from requirements following the Atzentis phase-based structure.

**Note:** This command replaces the former `/tasks` command. All task generation is now handled by `/specify`.

---

## Usage

```bash
# Generate new task from requirements
/specify P07-ai-foundation/requirements.md
/specify P07-ai-foundation/requirements.md FR-AI-001

# Generate/update existing task
/specify T07-001-ai-core-setup
/specify T07-001-ai-core-setup --append

# Generate all tasks for phase
/specify P07-ai-foundation/requirements.md --all

# Preview without creating
/specify P07-ai-foundation/requirements.md --dry-run
```

### Flags

| Flag | Description |
|------|-------------|
| `--all` | Generate all tasks for the entire phase |
| `--append` | Add subtasks to existing tasks.md (auto-numbers from last) |
| `--dry-run` | Preview task structure without creating files |
| `--force` | Overwrite existing tasks.md files |

### Append Mode (`--append`)

When adding subtasks to an existing task:

```bash
/specify T07-001-ai-core-setup --append
```

**Process:**
1. Read existing `tasks.md`
2. Find last subtask number (e.g., T07-001.5)
3. Generate new subtasks starting from T07-001.6
4. Append to existing file (preserves completed subtasks)

**Use cases:**
- Scope expansion mid-implementation
- Breaking down a subtask further
- Adding forgotten requirements

---

## Confidence Check

**CRITICAL:** Before generating tasks.md, verify understanding of requirements.

### High Confidence (≥70%) → Proceed

When you can clearly identify:
- [ ] Specific database tables/columns needed
- [ ] API endpoints with request/response shapes
- [ ] UI components and their data requirements
- [ ] Business rules and validation logic
- [ ] Multi-tenant isolation approach
- [ ] API key scope requirements

### Low Confidence (<70%) → Ask Questions

If unclear about any of the above, ASK before generating.

**Example Clarifying Questions:**

```markdown
Before generating tasks for FR-WS-003 (Workspace Settings), I need clarification:

1. **Data Model:** Should settings be stored in workspaces table or separate settings table?
2. **Scope:** Are settings tenant-wide or per-workspace?
3. **Permissions:** Can workspace members modify settings, or only admins?
4. **Events:** Should settings changes trigger Inngest events for audit logging?
5. **Caching:** Should settings be cached in Redis?

Please clarify or confirm I should use standard patterns from similar features.
```

**Do NOT generate tasks with assumptions.** Ask first.

---

## Process

### Step 0: Read Task Specification Skill (REQUIRED)

**BEFORE generating any tasks.md, read the task-specification skill:**

```bash
# Read skill before generating
view .claude/skills/specs/task-specification/SKILL.md
view .claude/skills/specs/task-specification/templates/task-structure.md
```

This ensures:
- Consistent structure across all tasks
- Multi-tenant patterns included
- API key patterns included
- Proper subtask format with skill references

### Step 1: Detect Last Task Number Within Phase

```typescript
// Extract phase from input
const phase = extractPhase(input); // "P07-ai-foundation" → "07"

// Scan for existing task folders
const existingTasks = glob(`.atzentis/specs/P${phase}-*/T${phase}-*`);

// Find maximum task number
const maxTaskNum = Math.max(...existingTasks.map(t => extractTaskNum(t)));

// Calculate next task number
const nextTaskNum = maxTaskNum + 1; // e.g., 4 if T07-003 exists
```

### Step 2: Parse Input

| Input Type | Action |
|------------|--------|
| Requirements file | Read and extract FRs, user stories |
| Task ID (T07-001) | Generate/update tasks.md for that task |
| Requirement ID (FR-AI-001) | Generate task from that specific requirement |

### Step 3: Generate Task ID

Format: `T{phase}-{task}-{name}`

Examples:
- `T07-001-ai-core-setup`
- `T07-002-chat-completion`
- `T01-003-api-key-management`

### Step 4: Create Task Directory

```
.atzentis/specs/P{XX}-{phase-name}/T{XX}-{NNN}-{task-name}/
```

### Step 5: Generate tasks.md

Using the task-file template, extract from requirements:
- Functional requirements (FR-*)
- User stories
- Acceptance criteria
- Dependencies
- Multi-tenant considerations
- API key scope requirements
- AI service patterns (if applicable)

### Step 5.5: Detect and Add Skill References (REQUIRED)

**For each subtask, detect the appropriate implementation skill and add a reference.**

#### Skill Detection Rules

| Subtask Contains | Skill Reference | Category |
|------------------|-----------------|----------|
| "database", "schema", "table", "migration" | `drizzle-schema` | backend |
| "API", "endpoint", "handler", "service" | `clean-architecture` | backend |
| "route", "OpenAPI", "Hono" | `hono-endpoint` | backend |
| "job", "queue", "background", "worker" | `background-jobs` | backend |
| "view", "page", "UI", "feature" | `fsd-feature` | frontend |
| "import", "architecture", "layer", "FSD" | `fsd-architecture` | frontend |
| "review", "validate", "PR", "violation" | `fsd-validator` | frontend |
| "form", "validation", "react-hook-form" | `form-patterns` | frontend |
| "table", "list", "grid", "data-table" | `data-table` | frontend |
| "AI", "chat", "completion", "streaming" | `ai-integration` | ai |

#### Detection Logic

```typescript
function detectSkill(subtaskTitle: string, subtaskSteps: string[]): string | null {
  const content = (subtaskTitle + ' ' + subtaskSteps.join(' ')).toLowerCase();
  
  // Backend skills
  if (content.match(/database|schema|table|migration|drizzle/)) {
    return 'drizzle-schema';
  }
  if (content.match(/api|endpoint|handler|service|crud/)) {
    return 'clean-architecture';
  }
  if (content.match(/route|openapi|hono/)) {
    return 'hono-endpoint';
  }
  if (content.match(/job|queue|background|worker|bullmq/)) {
    return 'background-jobs';
  }
  
  // Frontend skills
  if (content.match(/view|page|ui|feature|component/)) {
    return 'fsd-feature';
  }
  if (content.match(/import.*layer|architecture.*fsd|layer.*hierarchy/)) {
    return 'fsd-architecture';
  }
  if (content.match(/review.*import|validate.*fsd|pr.*check|violation/)) {
    return 'fsd-validator';
  }
  if (content.match(/form|validation|react-hook-form|zod/)) {
    return 'form-patterns';
  }
  if (content.match(/table|list|grid|data-table|tanstack/)) {
    return 'data-table';
  }
  
  // AI skills
  if (content.match(/ai|chat|completion|streaming|provider/)) {
    return 'ai-integration';
  }
  
  return null;
}
```

#### Skill Reference Format

Each subtask with a detected skill MUST include:

```markdown
### T{XX}-{NNN}.{N}: {Subtask Name}

**Estimate:** {X} hours
**Dependencies:** {deps}
**Skill:** `{skill-name}`

**Read Before Implementing:**
- `.claude/skills/{category}/{skill-name}/SKILL.md`
- `.claude/skills/{category}/{skill-name}/templates/{relevant-template}.md`

**Files to Create/Modify:**
...
```

#### Skill Path Mapping

| Skill | Path |
|-------|------|
| `drizzle-schema` | `.claude/skills/backend/drizzle-schema/` |
| `clean-architecture` | `.claude/skills/backend/clean-architecture/` |
| `hono-endpoint` | `.claude/skills/backend/hono-endpoint/` |
| `background-jobs` | `.claude/skills/backend/background-jobs/` |
| `fsd-feature` | `.claude/skills/frontend/fsd-feature/` |
| `fsd-architecture` | `.claude/skills/frontend/fsd-architecture/` |
| `fsd-validator` | `.claude/skills/frontend/fsd-validator/` |
| `form-patterns` | `.claude/skills/frontend/form-patterns/` |
| `data-table` | `.claude/skills/frontend/data-table/` |
| `ai-integration` | `.claude/skills/ai/ai-integration/` |

#### Example: Subtask with Skill Reference

```markdown
### T07-001.2: API Endpoints

**Estimate:** 8 hours
**Dependencies:** T07-001.1
**Skill:** `clean-architecture`

**Read Before Implementing:**
- `.claude/skills/backend/clean-architecture/SKILL.md`
- `.claude/skills/backend/clean-architecture/templates/handler.md`
- `.claude/skills/backend/clean-architecture/templates/service.md`
- `.claude/skills/backend/clean-architecture/templates/factory.md`
- `.claude/skills/backend/clean-architecture/templates/interface.md`

**Files to Create/Modify:**
- `apps/api/src/modules/ai/handlers/chat.handler.ts`
- `apps/api/src/modules/ai/services/chat.service.ts`
- `apps/api/src/modules/ai/factories/chat.factory.ts`
- `apps/api/src/modules/ai/interfaces/chat.interface.ts`

**Implementation Steps:**
- [ ] **Step 1:** Read clean-architecture SKILL.md
- [ ] **Step 2:** Copy handler.md template → customize for chat
...
```

### Step 6: Save File

```
.atzentis/specs/P{XX}-{phase-name}/T{XX}-{NNN}-{task-name}/tasks.md
```

---

## The 7-Step Process (for --all flag)

When using `--all`, apply this systematic methodology:

### Step 1: Extract Input Data

Gather from requirements.md:
- All User Stories
- All Functional Requirements (FR-*)
- Backend Resource Groups
- Non-Functional Requirements (NFR-*)

### Step 2: Identify Domains

Organize by:
- User workflow (API consumer vs Studio user)
- Backend resource (workspaces, phases, tasks, agents)
- Feature area (CRUD, AI services, integrations)

### Step 3: Apply Constraints

- Total hours match phase estimate
- Task size: 12-32 hours each
- Minimal overlap between tasks
- Clear dependencies

### Step 4: Test Alternatives

Evaluate different task groupings:

| Option | Tasks | Avg Size | Pros | Cons |
|--------|-------|----------|------|------|
| A | 6 tasks | 24h | Fewer PRs | Larger reviews |
| B | 8 tasks | 18h | Balanced | Standard |
| C | 10 tasks | 14h | Small PRs | More coordination |

**Key Decision Factors:**
1. **Size:** 12-32h per task
2. **Cohesion:** Related work together
3. **Parallelization:** Can developers work simultaneously?
4. **Backend Alignment:** Match API module structure

### Step 5: Validate Coverage

Create coverage matrix:

```markdown
| Requirement | Task | Subtask |
|-------------|------|---------|
| FR-AI-001 | T07-001 | T07-001.1 |
| FR-AI-002 | T07-001 | T07-001.2 |
| FR-AI-003 | T07-002 | T07-002.1 |
```

Verify:
- [ ] All FRs mapped to at least one task
- [ ] All user stories covered
- [ ] No orphan requirements

### Step 6: Size Estimation

Estimate hours per task:

| Task | Subtasks | Hours | Complexity |
|------|----------|-------|------------|
| T07-001 | 5 | 24h | High (AI integration) |
| T07-002 | 4 | 16h | Medium |
| T07-003 | 3 | 12h | Low |

Verify: Total matches phase estimate (±10%)

### Step 7: Create Subtasks

Break each task into 3-5 subtasks:
- Each subtask: 2-8 hours
- Clear deliverable per subtask
- Testable acceptance criteria

---

## Output Format

```markdown
# {Task Name}

**Task ID:** T{XX}-{NNN}
**Phase:** P{XX} - {Phase Name}
**Requirements:** FR-{AREA}-{NNN}, FR-{AREA}-{NNN}
**Total Estimate:** {X} hours
**Priority:** P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low)
**Dependencies:** T{XX}-{NNN} or None
**Blocks:** T{XX}-{NNN} or None
**Status:** Not Started

---

## File Location

**Path:** `.atzentis/specs/P{XX}-{phase-name}/T{XX}-{NNN}-{task-name}/tasks.md`

**Phase-Level Files:**
- **Requirements:** `.atzentis/specs/P{XX}-{phase-name}/requirements.md`
- **Task Breakdown:** `.atzentis/specs/P{XX}-{phase-name}/task-breakdown.md`

---

## Overview

{2-4 paragraphs describing what this task accomplishes, why it matters, and how it fits into the phase}

**Backend Status:** Not Started

**Development Strategy:** {Brief explanation - parallel opportunities, key decisions}

---

## Multi-Tenant Considerations

- **Tenant Isolation:** {How this task ensures data isolation}
- **Query Pattern:** All queries include `tenantId` filter
- **Cross-Tenant Access:** Returns 404, not 403
- **Unique Constraints:** Scoped per tenant (e.g., slug uniqueness)

---

## API Key Considerations

- **Required Scopes:** `{resource}:read`, `{resource}:write`
- **Rate Limiting:** Per tenant + per key limits apply
- **Audit Logging:** All mutations logged with API key ID

---

## AI Service Considerations (if applicable)

- **Provider:** OpenAI / Anthropic / Mistral
- **Cost Tracking:** Track tokens per tenant
- **Rate Limiting:** Separate AI rate limits
- **Caching:** Semantic cache for repeated queries
- **Streaming:** SSE for real-time responses

---

## Technical Specification

### Database Schema

```typescript
// packages/database/src/schema/tenant/{resource}.ts
export const tableName = sqliteTable('table_name', {
  id: text('id').primaryKey().$defaultFn(() => createId('prefix')),
  tenantId: text('tenant_id').notNull(), // REQUIRED
  // ... fields from requirements
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});
```

### API Endpoints

```typescript
// From FR-{AREA}-{NNN}
POST   /v1/{resources}      // Create
GET    /v1/{resources}      // List (paginated)
GET    /v1/{resources}/:id  // Get by ID
PATCH  /v1/{resources}/:id  // Update
DELETE /v1/{resources}/:id  // Soft delete
```

### Business Rules

- {Rule 1 from requirements}
- {Rule 2 from requirements}
- {Rule 3: Multi-tenant isolation}
- {Rule 4: API key validation}

---

## Work Stream Overview

```
Work Stream 1 (Backend): {Xh}
T{XX}-{NNN}.1 -> T{XX}-{NNN}.2 -> T{XX}-{NNN}.3

Work Stream 2 (Frontend): {Yh}
T{XX}-{NNN}.4 -> T{XX}-{NNN}.5

Parallel Opportunities:
- Day 1: T{XX}-{NNN}.1 || T{XX}-{NNN}.4 (Schema || UI scaffolding)
- Day 2: T{XX}-{NNN}.2 || T{XX}-{NNN}.5 (API || Components)
```

---

## Work Stream 1: Backend ({Xh})

### T{XX}-{NNN}.1: Database Schema & Migrations

**Estimate:** {X} hours
**Dependencies:** None
**Blocks:** T{XX}-{NNN}.2

**Files to Create:**
- `packages/database/src/schema/tenant/{resource}.ts` - Schema definition
- `packages/database/src/schema/tenant/index.ts` - Export
- `packages/database/drizzle/migrations/XXXX_*.sql` - Migration

**Implementation Steps:**

- [ ] **Step 1:** Create schema file
  - Define table with all columns from requirements
  - Add tenantId field (REQUIRED)
  - Add audit fields (createdAt, updatedAt, deletedAt)
  - Add indexes for tenantId and foreign keys

- [ ] **Step 2:** Generate migration
  - Run `bun db:generate`
  - Review generated SQL
  - Test migration locally

- [ ] **Step 3:** Export from index
  - Add to tenant schema barrel export
  - Verify types are generated

**Acceptance Criteria:**

- [ ] Schema matches requirements specification
- [ ] tenantId field present and indexed
- [ ] Migration runs without errors
- [ ] Types exported correctly
- [ ] Soft delete supported (deletedAt field)

**Testing:**

- [ ] Migration applies cleanly
- [ ] Migration rollback works
- [ ] Types compile without errors

---

### T{XX}-{NNN}.2: API Endpoints (CRUD)

**Estimate:** {X} hours
**Dependencies:** T{XX}-{NNN}.1
**Blocks:** T{XX}-{NNN}.4

**Files to Create:**
- `apps/api/src/modules/{domain}/routes/{resource}.route.ts`
- `apps/api/src/modules/{domain}/handlers/{resource}.handler.ts`
- `apps/api/src/modules/{domain}/services/{resource}.service.ts`
- `apps/api/src/modules/{domain}/factories/{resource}.factory.ts`
- `apps/api/src/modules/{domain}/interfaces/{resource}.interface.ts`

**Implementation Steps:**

- [ ] **Step 1:** Create interface layer
  - Define input/output types
  - Define service result types

- [ ] **Step 2:** Create factory layer
  - `buildRecord()` - API input → DB record
  - `buildResponse()` - DB record → API response

- [ ] **Step 3:** Create service layer
  - Implement CRUD operations
  - Add tenantId to ALL queries
  - Add audit logging
  - Trigger Inngest events

- [ ] **Step 4:** Create handler layer
  - Request validation (Zod)
  - API key validation
  - Tenant resolution
  - Response formatting

- [ ] **Step 5:** Create route layer
  - Define routes with OpenAPI
  - Apply middleware (auth, rate limit)

**Acceptance Criteria:**

- [ ] All CRUD endpoints working
- [ ] API key authentication enforced
- [ ] Tenant isolation verified (404 for cross-tenant)
- [ ] Rate limiting applied
- [ ] OpenAPI spec updated
- [ ] Validation errors return 400

**Testing:**

- [ ] Unit test: Service layer
- [ ] Unit test: Factory transformations
- [ ] Integration test: All endpoints
- [ ] Multi-tenant test: Isolation verified

---

## Work Stream 2: Frontend ({Yh})

### T{XX}-{NNN}.4: Feature Package Setup

**Estimate:** {X} hours
**Dependencies:** None (parallel with backend)
**Blocks:** T{XX}-{NNN}.5

**Files to Create:**
- `features/{feature}/package.json`
- `features/{feature}/src/index.ts`
- `features/{feature}/src/types/index.ts`
- `features/{feature}/src/api/{resource}.ts`
- `features/{feature}/src/hooks/use-{resource}.ts`
- `features/{feature}/src/schemas/{resource}-schema.ts`

**Implementation Steps:**

- [ ] **Step 1:** Create feature package
  - Initialize package.json
  - Set up exports (index, views, components, hooks)

- [ ] **Step 2:** Define types
  - Mirror API response types
  - Create form input types

- [ ] **Step 3:** Create API client
  - Implement fetch functions
  - Handle errors consistently

- [ ] **Step 4:** Create TanStack Query hooks
  - `use{Resource}s()` - List with pagination
  - `use{Resource}()` - Single item
  - `useCreate{Resource}()` - Mutation
  - `useUpdate{Resource}()` - Mutation
  - `useDelete{Resource}()` - Mutation

- [ ] **Step 5:** Create Zod schemas
  - Validation schemas for forms
  - Match backend validation

**Acceptance Criteria:**

- [ ] Package builds without errors
- [ ] Types match API contract
- [ ] Hooks handle loading/error states
- [ ] Mutations invalidate queries correctly

---

### T{XX}-{NNN}.5: UI Views & Components

**Estimate:** {X} hours
**Dependencies:** T{XX}-{NNN}.2, T{XX}-{NNN}.4

**Files to Create:**
- `features/{feature}/src/ui/views/{resources}-view.tsx`
- `features/{feature}/src/ui/views/{resource}-detail-view.tsx`
- `features/{feature}/src/ui/components/{resources}/{resource}-form.tsx`
- `features/{feature}/src/ui/components/{resources}/{resources}-table.tsx`
- `apps/client/src/app/(dashboard)/{resources}/page.tsx`

**Implementation Steps:**

- [ ] **Step 1:** Create list view
  - Use `use{Resource}s()` hook
  - Implement table with pagination
  - Add search/filter
  - Handle empty state

- [ ] **Step 2:** Create form component
  - Use React Hook Form + Zod
  - Handle create and edit modes
  - Show validation errors

- [ ] **Step 3:** Create detail view
  - Use `use{Resource}()` hook
  - Display all fields
  - Edit/delete actions

- [ ] **Step 4:** Create app routes
  - List page: `/{resources}/page.tsx`
  - Detail page: `/{resources}/[id]/page.tsx`
  - Create page: `/{resources}/new/page.tsx`

- [ ] **Step 5:** Add to navigation
  - Update sidebar navigation
  - Check plan-based access

**Acceptance Criteria:**

- [ ] List view displays data correctly
- [ ] Pagination works
- [ ] Forms validate correctly
- [ ] CRUD operations work end-to-end
- [ ] Loading states shown
- [ ] Error states handled
- [ ] Empty states displayed

**Testing:**

- [ ] Component tests for form
- [ ] Component tests for table
- [ ] E2E test: Create flow
- [ ] E2E test: Edit flow
- [ ] E2E test: Delete flow

---

## Overall Testing Checklist

### Multi-Tenant Tests (REQUIRED)

- [ ] Tenant A cannot read Tenant B resources (returns 404)
- [ ] Tenant A cannot update Tenant B resources (returns 404)
- [ ] Tenant A cannot delete Tenant B resources (returns 404)
- [ ] List endpoint only returns current tenant data
- [ ] Same slug allowed in different tenants

### API Key Tests

- [ ] Request without API key returns 401
- [ ] Invalid API key returns 401
- [ ] Expired API key returns 401
- [ ] Insufficient scope returns 403
- [ ] Rate limit exceeded returns 429

### Integration Tests

- [ ] Create with valid data returns 201
- [ ] Create with invalid data returns 400
- [ ] Get existing resource returns 200
- [ ] Get non-existent resource returns 404
- [ ] Update existing resource returns 200
- [ ] Delete existing resource returns 200

---

## Error Handling

| Error Case | HTTP Status | Error Code |
|------------|-------------|------------|
| Missing API key | 401 | UNAUTHORIZED |
| Invalid API key | 401 | UNAUTHORIZED |
| Insufficient scope | 403 | FORBIDDEN |
| Resource not found | 404 | NOT_FOUND |
| Validation error | 400 | VALIDATION_ERROR |
| Duplicate slug | 409 | CONFLICT |
| Rate limit exceeded | 429 | RATE_LIMIT_EXCEEDED |

---

## Definition of Done

- [ ] All subtasks completed
- [ ] All acceptance criteria verified
- [ ] Multi-tenant isolation tests passing
- [ ] API key authentication working
- [ ] Code follows Atzentis standards
- [ ] No console errors or warnings
- [ ] PR reviewed and approved
- [ ] Deployed to staging

---

## References

- Requirements: `.atzentis/specs/P{XX}-{phase-name}/requirements.md`
- Task Breakdown: `.atzentis/specs/P{XX}-{phase-name}/task-breakdown.md`
- API Handlers Guide: `.atzentis/docs/api-handlers.md`
- Frontend Architecture: `.atzentis/docs/frontend-architecture.md`
```

---

## Path Resolution

### Atzentis Path Format

```
.atzentis/specs/P{XX}-{phase-name}/T{XX}-{NNN}-{task-name}/tasks.md
```

### Examples

| Input | Output Path |
|-------|-------------|
| `P07-ai-foundation/requirements.md` | `.atzentis/specs/P07-ai-foundation/T07-001-{name}/tasks.md` |
| `T01-003-api-keys` | `.atzentis/specs/P01-auth-system/T01-003-api-keys/tasks.md` |
| `FR-WS-001` | `.atzentis/specs/P02-studio-core/T02-00X-workspaces/tasks.md` |

### Phase Directory Naming

Phase directories include both number AND name:

```
.atzentis/specs/
├── P01-auth-system/
├── P02-studio-core/
├── P03-workspaces/
├── P07-ai-foundation/
└── ...
```

---

## Examples

### Example 1: Generate Single Task

```bash
/specify P07-ai-foundation/requirements.md FR-AI-001
```

**Process:**
1. Read `.atzentis/specs/P07-ai-foundation/requirements.md`
2. Extract FR-AI-001 and related requirements
3. Detect last task: T07-002 exists
4. Create: `.atzentis/specs/P07-ai-foundation/T07-003-chat-completion/tasks.md`

### Example 2: Generate All Tasks for Phase

```bash
/specify P07-ai-foundation/requirements.md --all
```

**Process:**
1. Read all requirements from file
2. Apply 7-Step Process
3. Group into optimal tasks (6-10 tasks)
4. Create T07-001 through T07-00X
5. Update `task-breakdown.md`

**Output:**
```
Created 8 tasks for P07-ai-foundation:
- T07-001-ai-core-setup (24h)
- T07-002-provider-abstraction (20h)
- T07-003-chat-completion (16h)
- T07-004-streaming-responses (12h)
- T07-005-rate-limiting (16h)
- T07-006-cost-tracking (20h)
- T07-007-semantic-caching (18h)
- T07-008-testing-observability (14h)

Total: 140h (Target: 144h) ✓
Coverage: 15/15 FRs mapped ✓
```

### Example 3: Dry Run

```bash
/specify P07-ai-foundation/requirements.md --all --dry-run
```

**Output:**
```
DRY RUN - No files will be created

Proposed task structure:
├── T07-001-ai-core-setup/ (24h)
│   ├── T07-001.1: Provider abstraction layer
│   ├── T07-001.2: Configuration management
│   └── T07-001.3: Error handling
├── T07-002-chat-completion/ (16h)
│   ├── T07-002.1: API endpoint
│   ├── T07-002.2: Streaming support
│   └── T07-002.3: Token counting
...

Coverage matrix:
| Requirement | Task | Status |
|-------------|------|--------|
| FR-AI-001 | T07-001 | ✓ |
| FR-AI-002 | T07-001 | ✓ |
| FR-AI-003 | T07-002 | ✓ |
...

Run without --dry-run to create files.
```

### Example 4: Append Subtasks to Existing Task

```bash
/specify T07-001-ai-core-setup --append
```

**Context:** `tasks.md` already exists with T07-001.1 to T07-001.5

**Process:**
1. Read existing `.atzentis/specs/P07-ai-foundation/T07-001-ai-core-setup/tasks.md`
2. Detect last subtask: T07-001.5
3. Generate new subtasks starting from T07-001.6
4. Append to existing file

**Output:**
```
Appending to T07-001-ai-core-setup...

Existing subtasks: T07-001.1 to T07-001.5 (preserved)

New subtasks added:
  T07-001.6: Performance Optimization (4h)
  T07-001.7: Error Recovery Handling (3h)

Updated total: 7 subtasks (was 5)
Updated estimate: 28h (was 20h)

File updated: .atzentis/specs/P07-ai-foundation/T07-001-ai-core-setup/tasks.md
```

**Use cases:**
- Scope expansion discovered during implementation
- Breaking down a complex subtask
- Adding requirements that were missed initially

---

## Integration with Other Commands

| Command | Relationship |
|---------|-------------|
| `/plan` | Generates task-breakdown.md that /specify uses |
| `/implement` | Executes tasks created by /specify |
| `/verify` | Validates implementation against tasks.md |
| `/status` | Shows progress on tasks |
| `/tests` | Generates test-plan.md for coverage planning |

### Workflow

```
requirements.md
      ↓
   /plan        → task-breakdown.md
      ↓
  /specify      → tasks.md (detailed)
      ↓
   /tests       → test-plan.md (optional, for coverage planning)
      ↓
 /implement     → Code implementation (includes per-subtask tests)
      ↓
  /status       → Quick progress sync
      ↓
  /verify       → Full validation & gaps
```

---

## Notes

- Task numbering is phase-based (T07-001, T07-002) not global
- Format: Parent tasks (T07-001) with subtasks (T07-001.1, T07-001.2)
- Auto-numbering always uses next available task number within phase
- Use `--all` to create tasks for entire phase
- Use `--append` to add subtasks to existing task
- Use `--dry-run` to preview before creating
- Always verify confidence before generating
- Multi-tenant patterns are REQUIRED in every task
- **Skill references are REQUIRED for every subtask** - see Step 5.5

### Skill Integration Checklist

Before completing tasks.md generation:

- [ ] Read `task-specification` skill SKILL.md
- [ ] Each subtask has `**Skill:**` field
- [ ] Each subtask has `**Read Before Implementing:**` section
- [ ] Skill paths are correct for category (backend/frontend/ai)
- [ ] Relevant templates listed per skill

### Final Testing Task

When using `--all`, the LAST task generated should be a dedicated testing task:

```
T07-008-testing-observability/tasks.md
```

This final task includes:
- E2E test implementation (Playwright)
- Performance benchmarks
- Cross-feature integration tests
- CI/CD pipeline configuration
- Test coverage audit

**Note:** This is different from:
- **Per-subtask tests** (in each task's Testing: section) - written during implementation
- **test-plan.md** (from `/tests` command) - strategic planning document

---

## Related Templates

| Template | Purpose | Location |
|----------|---------|----------|
| **task-structure.md** | Structure for tasks.md files | `.atzentis/docs/templates/` |
| **testing-patterns.md** | Reusable test code patterns | `.atzentis/docs/templates/` |
| **requirements.md** | Phase requirements template | `.atzentis/docs/templates/` |

## Related Skills

| Skill | Purpose | Location |
|-------|---------|----------|
| **task-specification** | Task generation patterns | `.claude/skills/specs/task-specification/` |
| **clean-architecture** | Backend API patterns | `.claude/skills/backend/clean-architecture/` |
| **fsd-feature** | Frontend feature patterns | `.claude/skills/frontend/fsd-feature/` |
| **fsd-architecture** | FSD layer hierarchy rules | `.claude/skills/frontend/fsd-architecture/` |
| **fsd-validator** | FSD validation & PR review | `.claude/skills/frontend/fsd-validator/` |
| **drizzle-schema** | Database schema patterns | `.claude/skills/backend/drizzle-schema/` |
| **form-patterns** | Form implementation patterns | `.claude/skills/frontend/form-patterns/` |
| **data-table** | Data table patterns | `.claude/skills/frontend/data-table/` |
| **ai-integration** | AI service patterns | `.claude/skills/ai/ai-integration/` |

---

**Document Version:** 1.1
**Last Updated:** December 2025