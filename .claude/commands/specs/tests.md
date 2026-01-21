---
allowed-tools: Read, Write, Glob, Grep
description: Generate phase-wide test strategy document (test-plan.md) with FR mappings
---

# Generate Test Plan (/tests)

**Version:** 1.0
**Date:** December 2025
**Purpose:** Generate phase-wide test strategy document (`test-plan.md`)

Generate a comprehensive test plan for a phase or task. This creates a **strategic planning document** that maps tests to requirements and defines coverage goals.

---

## How This Differs from Other Documents

| Document | Purpose | Scope | When Used |
|----------|---------|-------|-----------|
| **test-plan.md** (this creates) | Phase-wide test strategy | Entire phase | Planning & audit |
| **testing-patterns.md** | Reusable test code examples | Reference | When writing tests |
| **task-structure.md** | Per-subtask test checklists | Per-task | During implementation |
| **Final Testing Task** | E2E, performance, CI/CD | Phase-wide | End of phase |

### What test-plan.md Contains

- **Requirements → Test mapping** (FR-AI-001 → which test file?)
- **Coverage strategy** (80% unit, 70% integration targets)
- **Test file structure** (where tests go)
- **Edge cases** extracted from requirements
- **CI/CD integration** configuration

### What test-plan.md Does NOT Contain

- Per-subtask implementation checklists (use task-structure.md)
- Copy-paste code patterns (use testing-patterns.md)
- E2E test implementation (use final testing task)

---

**Output:** `.atzentis/specs/P{XX}-{phase-name}/test-plan.md`

**Template:** References `testing-patterns.md` for code examples

## Usage

```bash
/tests T00-002-api-shell
/tests P00-foundation-setup
/tests P00-foundation-setup/requirements.md
```

## Process

### 1. Identify Context

- Detect if input is a single task or full phase
- Load related requirements or task breakdown
- Check existing implementation (if any)

```
If task ID (T00-002-api-shell):
  → Read .atzentis/specs/P00-foundation-setup/T00-002-api-shell/tasks.md
  → Extract acceptance criteria, files, business rules

If phase folder (P00-foundation-setup):
  → Read .atzentis/specs/P00-foundation-setup/requirements.md
  → Read .atzentis/specs/P00-foundation-setup/task-breakdown.md
  → Generate tests for all tasks in phase

If requirements file:
  → Read the file directly
  → Generate tests based on FRs and user stories
```

### 2. Extract Key Inputs

- Functional requirements (FR-XXX-NNN)
- Business rules and edge cases
- Integration points (external services, other modules)
- Dependencies (other tasks, phases)
- Multi-tenant requirements
- AI service requirements (if applicable)

### 3. Generate Test Categories

| Category | Purpose | Tool | Location |
|----------|---------|------|----------|
| **Unit Tests** | Core logic, validation, factories | Vitest | `tests/unit/` |
| **Integration Tests** | API endpoints, database, services | Bun test | `tests/integration/` |
| **E2E Tests** | User workflows, critical paths | Playwright | `tests/e2e/` |
| **Multi-Tenant Tests** | Tenant isolation, data security | Vitest/Bun | `tests/integration/` |
| **AI Service Tests** | LLM mocking, streaming, cost tracking | Vitest | `tests/unit/ai/` |
| **Performance Tests** | Response times, load handling | Vitest bench | `tests/performance/` |

### 4. Define Coverage Strategy

- Map tests to requirements (FR IDs)
- Identify critical paths (P0 tests)
- Define coverage targets (80% unit, 70% integration)
- Assign priorities

### 5. Generate Test Plan

Output to: `.atzentis/specs/P{XX}-{phase-name}/test-plan.md` or alongside task file

---

## Output Format

```markdown
# Test Plan: {Phase or Task ID} - {Name}

**Generated:** {YYYY-MM-DD}
**Source:** {input_path}
**Status:** Draft | Approved | In Progress | Complete

---

## Test Coverage Summary

| Category | Scope | Tool | Priority | Target Coverage |
|----------|-------|------|----------|-----------------|
| Unit Tests | Business logic, factories | Vitest | P0 | 80% |
| Integration | API endpoints, DB operations | Bun test | P0 | 70% |
| E2E | Critical user workflows | Playwright | P1 | Critical paths |
| Multi-Tenant | Tenant isolation | Vitest | P0 | 100% |
| AI Services | LLM integration | Vitest (mocked) | P1 | Key flows |

---

## Test File Structure

```
apps/api/tests/
├── unit/
│   └── {module}/
│       ├── {resource}.service.test.ts
│       ├── {resource}.factory.test.ts
│       └── {resource}.handler.test.ts
├── integration/
│   └── {module}/
│       ├── {resource}.api.test.ts
│       └── {resource}.db.test.ts
└── e2e/
    └── {feature}.spec.ts

apps/client/tests/
├── components/
│   └── {component}.test.tsx
└── e2e/
    └── {workflow}.spec.ts
```

---

## Requirements → Test Mapping

### Functional Requirements

| FR ID | Description | Test Type | Test File | Priority |
|-------|-------------|-----------|-----------|----------|
| FR-{AREA}-001 | {Description} | Unit | `{file}.test.ts` | P0 |
| FR-{AREA}-002 | {Description} | Integration | `{file}.api.test.ts` | P0 |
| FR-{AREA}-003 | {Description} | E2E | `{feature}.spec.ts` | P1 |

### Business Rules

| Rule | Test Case | Expected Result | Priority |
|------|-----------|-----------------|----------|
| {Rule 1} | {Test scenario} | {Expected} | P0 |
| {Rule 2} | {Test scenario} | {Expected} | P1 |

### Edge Cases

| Edge Case | Test Case | Expected Result |
|-----------|-----------|-----------------|
| {Edge case 1} | {Test scenario} | {Expected} |
| {Edge case 2} | {Test scenario} | {Expected} |

---

## Unit Tests

### {Module} Module

**File:** `tests/unit/{module}/{resource}.service.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create{Resource}, update{Resource} } from '../services/{resource}.service';

describe('{Resource} Service', () => {
  describe('create{Resource}', () => {
    it('should create {resource} with valid input', async () => {
      // Arrange
      const input = { /* valid input */ };
      const tenantId = 'tenant_123';
      
      // Act
      const result = await create{Resource}(input, tenantId);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.{resource}.id).toMatch(/^{prefix}_/);
    });

    it('should reject duplicate slug for same tenant', async () => {
      // Test tenant isolation
    });

    it('should allow same slug for different tenants', async () => {
      // Multi-tenant test
    });
  });
});
```

**Test Cases:**
- [ ] Create with valid input
- [ ] Create with missing required fields → ValidationError
- [ ] Create with duplicate slug (same tenant) → SlugExistsError
- [ ] Create with duplicate slug (different tenant) → Success
- [ ] Update existing record
- [ ] Update non-existent record → NotFoundError
- [ ] Delete (soft delete)
- [ ] Delete with dependencies → DependencyError

---

## Integration Tests

### API Endpoints

**File:** `tests/integration/{module}/{resource}.api.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { app } from '../../../src/app';
import { createTestTenant, cleanupTestTenant } from '../../helpers/tenant';

describe('{Resource} API', () => {
  let testTenant: TestTenant;
  let apiKey: string;

  beforeAll(async () => {
    testTenant = await createTestTenant();
    apiKey = testTenant.apiKey;
  });

  afterAll(async () => {
    await cleanupTestTenant(testTenant.id);
  });

  describe('POST /v1/{resources}', () => {
    it('should create {resource} with valid API key', async () => {
      const res = await app.request('/v1/{resources}', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test', slug: 'test' }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBeDefined();
    });

    it('should reject without API key', async () => {
      const res = await app.request('/v1/{resources}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      });

      expect(res.status).toBe(401);
    });

    it('should reject with invalid scope', async () => {
      // Test API key scope validation
    });
  });
});
```

**Test Cases:**
- [ ] POST /v1/{resources} - Create with valid input
- [ ] POST /v1/{resources} - Reject without API key (401)
- [ ] POST /v1/{resources} - Reject with wrong scope (403)
- [ ] GET /v1/{resources} - List with pagination
- [ ] GET /v1/{resources} - Filter by query params
- [ ] GET /v1/{resources}/:id - Get single resource
- [ ] GET /v1/{resources}/:id - Not found (404)
- [ ] GET /v1/{resources}/:id - Wrong tenant (404, not 403)
- [ ] PATCH /v1/{resources}/:id - Update resource
- [ ] DELETE /v1/{resources}/:id - Soft delete

---

## Multi-Tenant Isolation Tests

**File:** `tests/integration/multi-tenant/{resource}.isolation.test.ts`

```typescript
describe('Multi-Tenant Isolation: {Resource}', () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;

  beforeAll(async () => {
    tenantA = await createTestTenant('tenant-a');
    tenantB = await createTestTenant('tenant-b');
  });

  it('Tenant A cannot access Tenant B resources', async () => {
    // Create resource in Tenant B
    const resourceB = await createResource(tenantB.apiKey, { name: 'B Resource' });

    // Try to access from Tenant A
    const res = await app.request(`/v1/{resources}/${resourceB.id}`, {
      headers: { 'Authorization': `Bearer ${tenantA.apiKey}` },
    });

    // Should return 404, NOT 403 (don't leak existence)
    expect(res.status).toBe(404);
  });

  it('Tenant A list does not include Tenant B resources', async () => {
    // Create resources in both tenants
    await createResource(tenantA.apiKey, { name: 'A Resource' });
    await createResource(tenantB.apiKey, { name: 'B Resource' });

    // List from Tenant A
    const res = await app.request('/v1/{resources}', {
      headers: { 'Authorization': `Bearer ${tenantA.apiKey}` },
    });

    const data = await res.json();
    
    // Should only see Tenant A resources
    expect(data.items.every(r => r.tenantId === tenantA.id)).toBe(true);
  });

  it('Same slug allowed in different tenants', async () => {
    await createResource(tenantA.apiKey, { name: 'Test', slug: 'same-slug' });
    
    // Should succeed (different tenant)
    const res = await createResource(tenantB.apiKey, { name: 'Test', slug: 'same-slug' });
    expect(res.status).toBe(201);
  });
});
```

**Test Cases:**
- [ ] Tenant A cannot read Tenant B resources (404)
- [ ] Tenant A cannot update Tenant B resources (404)
- [ ] Tenant A cannot delete Tenant B resources (404)
- [ ] List endpoints only return current tenant data
- [ ] Aggregations scoped to tenant
- [ ] Same unique constraints per tenant (slug, etc.)

---

## AI Service Tests (if applicable)

**File:** `tests/unit/ai/{service}.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chatCompletion } from '../services/ai/chat.service';
import { mockOpenAI } from '../../mocks/openai';

vi.mock('@ai-sdk/openai', () => mockOpenAI);

describe('AI Chat Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return completion for valid input', async () => {
    mockOpenAI.setResponse({ content: 'Hello!' });

    const result = await chatCompletion({
      tenantId: 'tenant_123',
      messages: [{ role: 'user', content: 'Hi' }],
    });

    expect(result.content).toBe('Hello!');
  });

  it('should track token usage per tenant', async () => {
    mockOpenAI.setResponse({ 
      content: 'Response',
      usage: { prompt_tokens: 10, completion_tokens: 20 }
    });

    await chatCompletion({
      tenantId: 'tenant_123',
      messages: [{ role: 'user', content: 'Hi' }],
    });

    // Verify usage was logged
    const usage = await getUsageForTenant('tenant_123');
    expect(usage.tokens).toBe(30);
  });

  it('should respect rate limits per tenant', async () => {
    // Exhaust rate limit
    for (let i = 0; i < 100; i++) {
      await chatCompletion({ tenantId: 'tenant_123', messages: [] });
    }

    // Next request should fail
    await expect(
      chatCompletion({ tenantId: 'tenant_123', messages: [] })
    ).rejects.toThrow(RateLimitError);
  });

  it('should stream responses correctly', async () => {
    mockOpenAI.setStreamResponse(['Hello', ' ', 'World']);

    const chunks: string[] = [];
    const stream = await chatCompletionStream({
      tenantId: 'tenant_123',
      messages: [{ role: 'user', content: 'Hi' }],
    });

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    expect(chunks.join('')).toBe('Hello World');
  });
});
```

**Test Cases:**
- [ ] Chat completion with valid input
- [ ] Chat completion with streaming
- [ ] Token usage tracking per tenant
- [ ] Cost calculation accuracy
- [ ] Rate limiting per tenant
- [ ] Rate limiting per API key
- [ ] Provider fallback on error
- [ ] Semantic caching hit/miss
- [ ] Context window limit handling

---

## E2E Tests

**File:** `apps/client/tests/e2e/{feature}.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('{Feature} Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should complete {workflow} successfully', async ({ page }) => {
    // Step 1: Navigate to feature
    await page.click('a[href="/{feature}"]');
    await expect(page).toHaveURL('/{feature}');

    // Step 2: Create new item
    await page.click('button:has-text("Create")');
    await page.fill('[name="name"]', 'Test Item');
    await page.click('button:has-text("Save")');

    // Step 3: Verify creation
    await expect(page.locator('text=Test Item')).toBeVisible();
  });

  test('should handle error states', async ({ page }) => {
    // Test error handling
  });

  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    // Test mobile layout
  });
});
```

**Test Cases:**
- [ ] Complete happy path workflow
- [ ] Error state handling
- [ ] Empty state display
- [ ] Loading state display
- [ ] Mobile responsive behavior
- [ ] Keyboard navigation
- [ ] Form validation feedback

---

## Test Helpers

### Tenant Helper

```typescript
// tests/helpers/tenant.ts
export async function createTestTenant(name?: string): Promise<TestTenant> {
  const tenant = await db.insert(tenants).values({
    id: createId('tenant'),
    name: name || `Test Tenant ${Date.now()}`,
    slug: `test-${Date.now()}`,
  }).returning();

  const apiKey = await createApiKey(tenant.id, ['*']);

  return {
    id: tenant.id,
    apiKey: apiKey.key,
    cleanup: () => cleanupTestTenant(tenant.id),
  };
}

export async function cleanupTestTenant(tenantId: string): Promise<void> {
  // Delete tenant-specific database (drops entire DB)
  await dropTenantDatabase(tenantId);

  // Delete from META database (shared tables)
  await metaDb.delete(apiKeys).where(eq(apiKeys.tenantId, tenantId));
  await metaDb.delete(tenants).where(eq(tenants.id, tenantId));
}
```

### API Helper

```typescript
// tests/helpers/api.ts
export function createAuthenticatedRequest(apiKey: string) {
  return {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  };
}

export async function createResource(
  apiKey: string,
  data: CreateResourceInput
): Promise<Response> {
  return app.request('/v1/resources', {
    method: 'POST',
    ...createAuthenticatedRequest(apiKey),
    body: JSON.stringify(data),
  });
}
```

---

## Environments

| Environment | Purpose | Database | AI Services |
|-------------|---------|----------|-------------|
| **Local** | Developer testing | SQLite (local) | Mocked |
| **CI** | Automated testing | SQLite (in-memory) | Mocked |
| **Staging** | Pre-release validation | Turso (staging) | Real (test keys) |
| **Production** | Smoke tests only | Turso (prod) | Real |

---

## Acceptance Criteria

- [ ] All P0 requirements have tests
- [ ] Unit test coverage ≥ 80%
- [ ] Integration test coverage ≥ 70%
- [ ] All critical paths have E2E tests
- [ ] Multi-tenant isolation verified
- [ ] No test flakiness (3 consecutive passes)
- [ ] Tests run in < 5 minutes (unit + integration)
- [ ] E2E tests run in < 10 minutes

---

## CI Integration

```yaml
# .github/workflows/test.yml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: oven-sh/setup-bun@v1
    
    - name: Install dependencies
      run: bun install
    
    - name: Run unit tests
      run: bun test:unit --coverage
    
    - name: Run integration tests
      run: bun test:integration
    
    - name: Run E2E tests
      run: bun test:e2e
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
```

---

## References

- Requirements: `.atzentis/specs/P{XX}-{phase-name}/requirements.md`
- Task Breakdown: `.atzentis/specs/P{XX}-{phase-name}/task-breakdown.md`
- Architecture: `.atzentis/docs/architecture/`
- Tech Stack: `.atzentis/docs/tech-stack.md`

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| {YYYY-MM-DD} | Initial creation | {Author} |

---

**Created:** {YYYY-MM-DD}
**Last Updated:** {YYYY-MM-DD}
```

---

## Notes

- Generates structured test plan per phase or task
- Maps tests to functional requirements (FR IDs)
- Includes Atzentis-specific patterns:
  - Multi-tenant isolation tests
  - API key authentication tests
  - AI service mocking and testing
  - Rate limiting tests
- Uses correct tools: Vitest, Bun test, Playwright
- Integrates with CI/CD pipeline
- Works best after `/plan` and `/tasks` have been executed

---

## Quick Reference

### Test Commands

```bash
# Run all tests
bun test

# Run unit tests only
bun test:unit

# Run integration tests
bun test:integration

# Run E2E tests
bun test:e2e

# Run with coverage
bun test:unit --coverage

# Run specific file
bun test tests/unit/workspaces/workspace.service.test.ts

# Watch mode
bun test --watch
```

### Test File Naming

| Type | Pattern | Example |
|------|---------|---------|
| Unit test | `{file}.test.ts` | `workspace.service.test.ts` |
| Integration | `{resource}.api.test.ts` | `workspace.api.test.ts` |
| E2E | `{feature}.spec.ts` | `workspaces.spec.ts` |
| Component | `{component}.test.tsx` | `workspace-form.test.tsx` |

---

**Document Version:** 1.0
**Last Updated:** December 2025