# Implement Tasks (/implement)

**Version:** 1.0
**Date:** December 2025
**Purpose:** Execute implementation from tasks.md files

Execute implementation from `tasks.md` files. This command reads subtasks and implements them ONE AT A TIME with clear completion markers.

---

## Usage

```bash
/implement T07-001-ai-core-setup
/implement T07-001-ai-core-setup T07-001.1
/implement T07-001-ai-core-setup T07-001.1 to T07-001.5
/implement T07-001-ai-core-setup --continue
/implement T07-001-ai-core-setup --work-stream 1
```

### Flags

| Flag | Description |
|------|-------------|
| `--continue` | Resume from last incomplete subtask |
| `--work-stream N` | Implement only subtasks in Work Stream N |
| `--dry-run` | Show what would be implemented without changes |
| `--skip-tests` | Skip test verification (not recommended) |

---

## Confidence Check (Before Starting)

| Confidence | Action |
|------------|--------|
| **≥90%** | Proceed with implementation |
| **70-89%** | Present 2-3 alternatives to user, wait for choice |
| **<70%** | Ask 1-3 clarifying questions, wait for response |

**Key Principles:**
- If tasks.md is well-written, confidence should be **≥90%** automatically
- If confidence is <90%, the **tasks.md is incomplete** — report what's missing
- **Maximum 3 questions** before attempting implementation
- **Never** return to `/plan` or `/specify` mid-implementation — PAUSE and ASK

---

## Critical Rules (Prevent Loops)

### Rule 1: ONE SUBTASK AT A TIME

- Complete ONE subtask fully before starting the next
- Never implement dependencies recursively
- If dependency is incomplete: WARN and STOP, ask user what to do

### Rule 2: CLEAR EXIT CONDITIONS

- After completing ALL subtasks in range: STOP and report
- After hitting a blocker: STOP and report
- After implementing requested subtask: STOP and report

### Rule 3: SMART FILE READING

- Read files specified in subtask FIRST
- Reference architecture docs ONLY when needed for specific patterns
- Do NOT read all guides upfront — read on-demand

### Rule 4: NO RECURSIVE IMPLEMENTATION

If subtask depends on incomplete subtask:
```
Report: "Subtask T07-001.3 depends on incomplete T07-001.2"
Ask: "Should I implement T07-001.2 first, or skip to next independent task?"
WAIT for user response
```

### Rule 5: MARK PROGRESS EXPLICITLY

- After completing each subtask, update tasks.md checkbox: `- [ ]` → `- [x]`
- Report what was completed
- Report what's next

### Rule 6: READ SKILL BEFORE IMPLEMENTING

- Extract `**Skill:**` field from subtask
- Read skill SKILL.md BEFORE writing any code
- Read skill templates listed in `**Read Before Implementing:**`
- Follow skill patterns exactly
- Skills are the PRIMARY source — docs are supplementary

```
✅ CORRECT ORDER:
1. Read skill SKILL.md
2. Read skill templates
3. Copy template structure
4. Customize for subtask
5. Implement following tasks.md steps

❌ WRONG ORDER:
1. Start coding immediately
2. Reference docs randomly
3. Ignore skill patterns
```

---

## Process

### Step 1: Parse Input

Extract from input:
- Task ID: `T{XX}-{NNN}-{name}`
- Subtask range (if provided): `T{XX}-{NNN}.{start}` to `T{XX}-{NNN}.{end}`
- Work stream (if specified)

### Step 2: Locate tasks.md

```
Primary: .atzentis/specs/P{XX}-{phase-name}/T{XX}-{NNN}-{task-name}/tasks.md
```

If not found:
```
ERROR: Tasks file not found
Expected: .atzentis/specs/P07-ai-foundation/T07-001-ai-core-setup/tasks.md

Suggestions:
1. Run /specify P07-ai-foundation/requirements.md to generate tasks
2. Check task ID is correct
3. Verify phase folder exists

STOP
```

### Step 3: Read and Parse tasks.md

Extract:
- Work Stream structure (if present)
- Subtask list with checkboxes
- Completion status of each subtask
- File paths from subtask definitions
- Dependencies between subtasks
- Multi-tenant considerations
- API key requirements
- AI service patterns (if applicable)
- **Skill references** (e.g., `**Skill:** \`clean-architecture\``)
- **Read Before Implementing** paths (skill files to read)

### Step 4: Identify Target Subtask

**If task has Work Streams:**
- Identify which work stream subtask belongs to
- Verify work stream dependencies are met
- Report: "Implementing Work Stream {N}: {Name}"
- Note parallel opportunities: "T07-001.4 can run in parallel"

**Selection logic:**
- Select FIRST incomplete subtask from requested range
- If all complete: Report and STOP

### Step 5: Check Dependencies (WARN, DON'T RECURSE)

```
⚠️ DEPENDENCY CHECK

Subtask T07-001.3 depends on:
- T07-001.1 (✅ complete)
- T07-001.2 (❌ incomplete)

Options:
1. Implement T07-001.2 first
2. Skip to T07-001.4 (Work Stream 2 - independent)
3. Proceed anyway (may cause errors)

Your choice: _
```

### Step 6: Read Skill Files (REQUIRED)

**BEFORE implementing, read the skill referenced in the subtask.**

#### Extract Skill Reference

From tasks.md subtask section:

```markdown
### T07-001.2: API Endpoints

**Skill:** `clean-architecture`

**Read Before Implementing:**
- `.claude/skills/backend/clean-architecture/SKILL.md`
- `.claude/skills/backend/clean-architecture/templates/handler.md`
- `.claude/skills/backend/clean-architecture/templates/service.md`
```

#### Read Skill Files

```bash
# 1. Read the skill SKILL.md first
view .claude/skills/backend/clean-architecture/SKILL.md

# 2. Read relevant templates
view .claude/skills/backend/clean-architecture/templates/handler.md
view .claude/skills/backend/clean-architecture/templates/service.md
view .claude/skills/backend/clean-architecture/templates/factory.md
view .claude/skills/backend/clean-architecture/templates/interface.md
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

#### If No Skill Reference

If subtask doesn't have a `**Skill:**` field:
1. Detect skill based on subtask content (see detection rules)
2. Read appropriate skill before implementing
3. Follow skill patterns

#### Skill Detection Rules

| Subtask Contains | Use Skill |
|------------------|-----------|
| "database", "schema", "migration" | `drizzle-schema` |
| "API", "endpoint", "handler" | `clean-architecture` |
| "view", "page", "component" | `fsd-feature` |
| "import", "layer", "FSD hierarchy" | `fsd-architecture` |
| "review", "validate", "PR check" | `fsd-validator` |
| "form", "validation" | `form-patterns` |
| "table", "list", "grid" | `data-table` |
| "AI", "chat", "completion" | `ai-integration` |

### Step 6.5: Read Additional Context (On-Demand)

**After reading skill files, read additional docs only if needed:**

**Read when skill doesn't cover pattern:**
- `.atzentis/docs/api-handlers.md` - Additional Clean Architecture patterns
- `.atzentis/docs/frontend-architecture.md` - Additional FSD patterns

**Read when implementing AI services:**
- `.atzentis/docs/ai-services.md` - Provider abstraction details

**Read when implementing tests:**
- `.atzentis/docs/templates/testing-patterns.md` - Test code patterns

**Key Principle:** Skills should be the PRIMARY source. Docs are supplementary.

### Step 7: Implement Current Subtask

1. **Follow skill patterns first** — Use templates from skill
2. Follow implementation steps from tasks.md exactly
3. Apply Atzentis patterns from skill and docs
4. Create/modify files as specified
5. Verify acceptance criteria
6. Run relevant tests

**Implementation Order:**

```
1. Read skill SKILL.md (understand pattern)
2. Read skill templates (copy structure)
3. Customize template for this subtask
4. Follow tasks.md implementation steps
5. Verify against acceptance criteria
```

**For Backend Subtasks (using `clean-architecture` skill):**

```typescript
// Follow 4-layer pattern from skill:
// Handler → Service → Factory → Interface

// Handler (from templates/handler.md):
// - Check permissions
// - Call service
// - Format response with factory
// - Log operation

// Service (from templates/service.md):
// - Business logic
// - Transactions
// - Audit logging
// - Uses tenantDb parameter (DB-per-tenant isolation)

// Factory (from templates/factory.md):
// - buildRecord() for DB insert
// - formatResponse() for API output

// Interface (from templates/interface.md):
// - Entity types matching DB
// - Input/Output types
```

**For Frontend Subtasks (using `fsd-feature` skill):**

```typescript
// Follow 4-layer pattern from skill:
// View → Hook → Component → API

// View (from templates/view.md):
// - Composition only
// - Uses hooks for data
// - Uses components for UI

// Hook (from templates/hook.md):
// - TanStack Query
// - Optimistic updates
// - Cache invalidation

// Component (from templates/component.md):
// - Props-driven
// - Uses @atzentis/ui
// - No data fetching
```

**For AI Service Subtasks (using `ai-integration` skill):**

```typescript
// Follow pattern from skill:
const tenantDb = c.get('tenantDb');
const tenantId = c.get('tenantId');  // For meta DB and caching

await checkRateLimit(tenantId);
const cached = await getSemanticCache(input, tenantId);
if (cached) return { ...cached, fromCache: true };

const response = await aiCore.chat({ ... });

await trackAIUsage(tenantId, response.usage);
await setSemanticCache(input, response, tenantId);

return response;
```

**Multi-Tenant Pattern (ALWAYS REQUIRED):**

```typescript
// DB-per-tenant isolation - NO tenantId filtering in tenant queries
const tenantDb = c.get('tenantDb');
const items = await tenantDb.query.resources.findMany({
  where: isNull(resources.deletedAt)  // No tenantId needed - DB-level isolation
});

// Meta DB queries still use tenantId filtering
const tenantId = c.get('tenantId');
const keys = await metaDb.query.apiKeys.findMany({
  where: eq(apiKeys.tenantId, tenantId)  // Meta tables HAVE tenantId
});
```

### Step 8: Verify Quality Gates

After implementing, verify ALL gates pass:

```markdown
## Quality Gates ✓

- [x] TypeScript compiles without errors
- [x] No linting errors (`bun lint`)
- [x] Acceptance criteria from subtask met
- [x] Files created in correct locations
- [x] Patterns match project standards

### Multi-Tenant Verification (REQUIRED)
- [x] Handlers use `c.get('tenantDb')` for tenant-specific database
- [x] Services receive `tenantDb` parameter (NOT `tenantId`)
- [x] NO tenantId filtering in tenant DB queries (DB-level isolation)
- [x] Meta DB queries use tenantId filtering where applicable
- [x] Cross-tenant access returns 404 (not 403)
- [x] List endpoints scoped to tenant (automatic via tenantDb)

### API Key Verification (REQUIRED)
- [x] Authentication middleware applied
- [x] Scope validation for mutations
- [x] Rate limiting middleware applied
- [x] Audit logging for sensitive operations

### Test Verification
- [x] Unit tests pass: `bun test:unit`
- [x] Integration tests pass: `bun test:integration`
- [x] Multi-tenant isolation tests pass
```

### Step 9: Mark Complete and Report

```
✅ COMPLETED: T07-001.2 - API Endpoints (CRUD)

Files created:
  + apps/api/src/modules/ai/routes/chat.route.ts (45 lines)
  + apps/api/src/modules/ai/handlers/chat.handler.ts (120 lines)
  + apps/api/src/modules/ai/services/chat.service.ts (180 lines)
  + apps/api/src/modules/ai/factories/chat.factory.ts (60 lines)

Files modified:
  ~ apps/api/src/modules/ai/routes/index.ts (added export)

Quality Gates:
  ✓ TypeScript compiles
  ✓ Multi-tenant isolation verified
  ✓ API key authentication applied
  ✓ Rate limiting applied
  ✓ Tests passing (12/12)

Next: T07-001.3 - Streaming Support (Work Stream 1)
Parallel: T07-001.4 - Frontend Setup (Work Stream 2)

Continue? (Y/n): _
```

### Step 10: Continue or Stop

| User Response | Action |
|---------------|--------|
| "continue" / "y" / Enter | Go to Step 4 with next subtask |
| "stop" / "n" | Report progress summary and STOP |
| "parallel" | Show parallel subtasks available |
| No more subtasks | Report completion and STOP |

---

## Output Formats

### Progress Display

```
T07-001: AI Core Setup
[████████░░] 80% (4/5 subtasks)

Work Stream 1 (Backend): 3/3 ✓
Work Stream 2 (Frontend): 1/2

Current: T07-001.4 - Feature Package Setup
```

### Subtask Start

```
─────────────────────────────────────────────────────────────────
📋 IMPLEMENTING: T07-001.2 - API Endpoints (CRUD)
   Work Stream: 1 (Backend)
   Estimate: 4 hours
   Skill: clean-architecture
─────────────────────────────────────────────────────────────────

Reading skill files:
  ✓ .claude/skills/backend/clean-architecture/SKILL.md
  ✓ .claude/skills/backend/clean-architecture/templates/handler.md
  ✓ .claude/skills/backend/clean-architecture/templates/service.md
  ✓ .claude/skills/backend/clean-architecture/templates/factory.md

Files to create:
  + apps/api/src/modules/ai/routes/chat.route.ts
  + apps/api/src/modules/ai/handlers/chat.handler.ts
  + apps/api/src/modules/ai/services/chat.service.ts
  + apps/api/src/modules/ai/factories/chat.factory.ts
  + apps/api/src/modules/ai/interfaces/chat.interface.ts

Files to modify:
  ~ apps/api/src/modules/ai/routes/index.ts

Steps:
  1. Create interface layer (types)
  2. Create factory layer (transformations)
  3. Create service layer (business logic + tenant isolation)
  4. Create handler layer (validation + auth)
  5. Create route layer (OpenAPI)

Reading: .atzentis/docs/api-handlers.md for patterns...

Starting step 1...
```

### Subtask Complete

```
✅ T07-001.2 COMPLETE

Created:
  + apps/api/src/modules/ai/routes/chat.route.ts (45 lines)
  + apps/api/src/modules/ai/handlers/chat.handler.ts (120 lines)
  + apps/api/src/modules/ai/services/chat.service.ts (180 lines)
  + apps/api/src/modules/ai/factories/chat.factory.ts (60 lines)
  + apps/api/src/modules/ai/interfaces/chat.interface.ts (40 lines)

Modified:
  ~ apps/api/src/modules/ai/routes/index.ts (+1 export)

Acceptance Criteria:
  ✓ All CRUD endpoints working
  ✓ API key authentication enforced
  ✓ Tenant isolation verified (404 for cross-tenant)
  ✓ Rate limiting applied
  ✓ OpenAPI spec updated
  ✓ Validation errors return 400

Tests:
  ✓ 8 unit tests passing
  ✓ 6 integration tests passing
  ✓ 4 multi-tenant tests passing

Continue to T07-001.3? (Y/n): _
```

### All Complete

```
═══════════════════════════════════════════════════════════════
✅ IMPLEMENTATION COMPLETE
═══════════════════════════════════════════════════════════════

Task: T07-001 - AI Core Setup
Phase: P07 - AI Foundation
Subtasks: 5/5 complete

Summary:
  Work Stream 1 (Backend):
    ✓ T07-001.1: Database Schema & Migrations
    ✓ T07-001.2: API Endpoints (CRUD)
    ✓ T07-001.3: Streaming Support

  Work Stream 2 (Frontend):
    ✓ T07-001.4: Feature Package Setup
    ✓ T07-001.5: UI Views & Components

Files created: 18
Files modified: 5
Total lines: ~1,200

Tests:
  ✓ 24 unit tests
  ✓ 12 integration tests
  ✓ 8 multi-tenant tests
  ✓ 4 E2E tests

Next task: T07-002 - Chat Completion API

Run `/implement T07-002-chat-completion` to continue.
═══════════════════════════════════════════════════════════════
```

---

## Handling Edge Cases

### Missing tasks.md

```
ERROR: Tasks file not found

Expected: .atzentis/specs/P07-ai-foundation/T07-001-ai-core-setup/tasks.md

Suggestions:
1. Run `/specify P07-ai-foundation/requirements.md` to generate tasks
2. Check task ID is correct: T07-001-ai-core-setup
3. Verify phase folder exists: P07-ai-foundation

STOP
```

### Dependency Not Complete

```
⚠️ DEPENDENCY INCOMPLETE

Subtask T07-001.3 (Streaming Support) depends on:
  ✓ T07-001.1 - Database Schema (complete)
  ✗ T07-001.2 - API Endpoints (incomplete)

Options:
  1. Implement T07-001.2 first
  2. Skip to T07-001.4 (Work Stream 2 - independent)
  3. Proceed anyway (may cause errors)

Your choice: _
```

### Work Stream Parallel Opportunity

```
💡 PARALLEL OPPORTUNITY

You just completed T07-001.2 (Work Stream 1: Backend)

Available in parallel:
  - T07-001.4: Feature Package Setup (Work Stream 2: Frontend)
  - T07-001.5: UI Views & Components (after T07-001.4)

Continue with:
  1. T07-001.3 (next in Work Stream 1)
  2. T07-001.4 (start Work Stream 2)

Your choice: _
```

### Multi-Tenant Violation Detected

```
❌ MULTI-TENANT VIOLATION DETECTED

File: apps/api/src/modules/ai/services/chat.service.ts
Line 45:

  // ❌ WRONG - Using global db instead of tenantDb
  const items = await db.query.chats.findMany({
    where: eq(chats.userId, userId)
  });

  // ✅ CORRECT - Use tenant database (DB-per-tenant isolation)
  const tenantDb = c.get('tenantDb');
  const items = await tenantDb.query.chats.findMany({
    where: eq(chats.userId, userId)  // No tenantId needed - DB isolation
  });

Fix this before continuing? (Y/n): _
```

### API Key Middleware Missing

```
❌ API KEY MIDDLEWARE MISSING

File: apps/api/src/modules/ai/routes/chat.route.ts

Route POST /v1/chat is missing authentication:

  // ❌ WRONG - No auth middleware
  app.post('/v1/chat', chatHandler);

  // ✅ CORRECT - Apply auth middleware
  app.post('/v1/chat', authMiddleware, rateLimitMiddleware, chatHandler);

Fix this before continuing? (Y/n): _
```

---

## Quality Gates Checklist

### Required for ALL Subtasks

- [ ] TypeScript compiles without errors
- [ ] No linting errors (`bun lint`)
- [ ] Acceptance criteria from tasks.md met
- [ ] Files created in correct locations
- [ ] Patterns match Atzentis standards

### Required for Backend Subtasks

- [ ] **Multi-tenant:** Use `c.get('tenantDb')` in handlers
- [ ] **Multi-tenant:** Services receive `tenantDb` parameter
- [ ] **Multi-tenant:** NO tenantId filter in tenant DB queries
- [ ] **Multi-tenant:** Cross-tenant access returns 404 (not 403)
- [ ] **API key:** Authentication middleware applied
- [ ] **API key:** Scope validation for mutations
- [ ] **Rate limiting:** Middleware applied to routes
- [ ] **Audit logging:** Sensitive operations logged
- [ ] **OpenAPI:** Spec updated with new endpoints

### Required for Frontend Subtasks

- [ ] **FSD:** No UI primitive imports in apps layer
- [ ] **FSD:** Views in correct feature package
- [ ] **FSD:** Components in plural-named folders
- [ ] **Forms:** React Hook Form + Zod validation
- [ ] **Hooks:** TanStack Query for data fetching
- [ ] **Loading:** Loading states handled
- [ ] **Errors:** Error states handled
- [ ] **Empty:** Empty states displayed

### Required for AI Service Subtasks

- [ ] **Rate limiting:** `checkRateLimit()` called first
- [ ] **Caching:** Semantic cache checked before API call
- [ ] **Cost tracking:** `trackAIUsage()` called after response
- [ ] **Streaming:** SSE for streaming responses
- [ ] **Provider:** Using `@atzentis/ai-core` abstraction
- [ ] **Errors:** Provider-specific errors handled

### Required for Test Subtasks

- [ ] Unit tests: `bun test:unit` passing
- [ ] Integration tests: `bun test:integration` passing
- [ ] Multi-tenant tests: Isolation verified
- [ ] Coverage: Meets minimum thresholds

---

## Anti-Patterns to Avoid

### ❌ DON'T: Recursive Dependency Implementation

```typescript
// BAD: Causes infinite loop
if (dependency.incomplete) {
  implement(dependency);  // May have its own dependencies!
}

// GOOD: Ask user
if (dependency.incomplete) {
  report("Dependency incomplete");
  askUser("Implement dependency first?");
  waitForResponse();
}
```

### ❌ DON'T: Read Everything First

```typescript
// BAD: Context overflow
readFile('.atzentis/docs/system-architecture.md');
readFile('.atzentis/docs/frontend-architecture.md');
readFile('.atzentis/docs/api-handlers.md');
readFile('.atzentis/docs/tech-stack.md');
// Context is full before starting

// GOOD: Read on-demand
readFile('tasks.md');  // Always read first
if (implementingBackend) {
  readFile('.atzentis/docs/api-handlers.md');
}
```

### ❌ DON'T: Continue Without User Confirmation

```typescript
// BAD: User loses control
for (subtask of allSubtasks) {
  implement(subtask);
}

// GOOD: Checkpoint after each
implement(subtask);
markComplete(subtask);
report(completion);
waitForUserConfirmation();
```

### ❌ DON'T: Skip Multi-Tenant Verification

```typescript
// BAD: Security vulnerability
const items = await db.query.resources.findMany({
  where: eq(resources.id, id)
});

// GOOD: Use tenant database (DB-per-tenant isolation)
const tenantDb = c.get('tenantDb');
const items = await tenantDb.query.resources.findMany({
  where: eq(resources.id, id)  // No tenantId - DB-level isolation
});
```

### ❌ DON'T: Forget API Key Middleware

```typescript
// BAD: Unauthenticated endpoint
app.post('/v1/resources', createHandler);

// GOOD: Apply auth stack
app.post('/v1/resources', 
  apiKeyAuth,      // Validate API key
  resolveTenant,   // Set tenant context
  rateLimit,       // Apply rate limits
  validateBody,    // Validate request
  createHandler    // Handle request
);
```

---

## Integration with Other Commands

| Command | Relationship |
|---------|-------------|
| `/specify` | Creates tasks.md that /implement executes |
| `/status` | Shows progress on implementation |
| `/verify` | Validates completed implementation |
| `/tests` | Generates test plan for implemented code |

### Workflow

```
/specify → tasks.md → /implement → Code → /verify → /tests
```

---

## Notes

- This is **Phase 2 (Implementation)** of the three-phase methodology
- Follows tasks.md exactly — don't deviate from the spec
- **Read skill files BEFORE implementing** — skills are the primary source
- Respects Work Stream structure for parallel development
- Creates checkpoints after each subtask for user control
- References architecture docs on-demand, not all upfront
- Multi-tenant verification is REQUIRED, not optional
- API key authentication is REQUIRED on all endpoints

### Skill Integration Checklist

Before implementing each subtask:

- [ ] Extract `**Skill:**` field from subtask
- [ ] Read skill SKILL.md
- [ ] Read skill templates listed in `**Read Before Implementing:**`
- [ ] Copy template structure, customize for subtask
- [ ] Follow skill patterns exactly
- [ ] Verify against skill checklist

### Skill Priority Order

1. **Skill templates** — Primary source, copy and customize
2. **tasks.md steps** — Specific implementation details
3. **Architecture docs** — Additional patterns not in skill

---

## Related Skills

| Skill | Purpose | Location |
|-------|---------|----------|
| **clean-architecture** | Backend API patterns | `.claude/skills/backend/clean-architecture/` |
| **fsd-feature** | Frontend feature patterns | `.claude/skills/frontend/fsd-feature/` |
| **fsd-architecture** | FSD layer hierarchy rules | `.claude/skills/frontend/fsd-architecture/` |
| **fsd-validator** | FSD validation & PR review | `.claude/skills/frontend/fsd-validator/` |
| **drizzle-schema** | Database schema patterns | `.claude/skills/backend/drizzle-schema/` |
| **form-patterns** | Form implementation | `.claude/skills/frontend/form-patterns/` |
| **data-table** | Data table patterns | `.claude/skills/frontend/data-table/` |
| **ai-integration** | AI service patterns | `.claude/skills/ai/ai-integration/` |

---

**Document Version:** 1.1
**Last Updated:** December 2025