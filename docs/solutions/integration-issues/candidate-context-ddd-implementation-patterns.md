---
title: "Candidate Bounded Context — DDD with State Machine"
date: "2026-02-19"
category: "integration-issues"
tags:
  - ddd
  - bounded-context
  - state-machine
  - drizzle-orm
  - aggregate-root
  - event-driven
  - pagination
  - cross-context
severity: "major"
component: "candidate"
related_issues: ["GET-8"]
related_docs:
  - docs/solutions/integration-issues/bounded-context-ddd-implementation-patterns.md
  - docs/solutions/integration-issues/nextjs16-infrastructure-scaffolding-gotchas.md
  - docs/plans/2026-02-19-feat-candidate-context-manual-creation-state-machine-plan.md
---

# Candidate Bounded Context — DDD Implementation Patterns

## Problem

Building the second DDD bounded context (Candidate) following the Scenario pattern, with additional complexity: a class-based aggregate root with state machine, cross-context integration, paginated list queries, and idempotent event handlers.

## Key Patterns Implemented

### 1. Class-Based Aggregate Root vs Plain Interfaces

**When to use which:**

| Criteria                                | AggregateRoot class | Plain interface |
| --------------------------------------- | ------------------- | --------------- |
| State machine with invalid transitions  | Yes                 | —               |
| Domain invariants that must always hold | Yes                 | —               |
| Methods that modify internal state      | Yes                 | —               |
| Pure CRUD, no behavior                  | —                   | Yes             |
| All logic in repository/use-case        | —                   | Yes             |

**Candidate uses AggregateRoot** because it has a 6-state machine with forward-only transitions. Scenario's entities (FailureMode, RiskTier, etc.) use plain interfaces because they're simple CRUD.

```typescript
// src/contexts/candidate/domain/entities/Candidate.ts
const VALID_TRANSITIONS: Record<CandidateState, CandidateState[]> = {
  raw: ["selected"],
  scored: ["selected"],
  selected: ["labeled"],
  labeled: ["validated"],
  validated: ["released"],
  released: [],
};

export class Candidate extends AggregateRoot {
  transitionTo(targetState: CandidateState): void {
    const allowed = VALID_TRANSITIONS[this._state];
    if (!allowed.includes(targetState)) {
      throw new InvalidStateTransitionError(
        "Candidate",
        this._state,
        targetState
      );
    }
    const fromState = this._state;
    this._state = targetState;
    this._updatedAt = new Date();
    this.addDomainEvent("candidate.state_changed", {
      candidate_id: this.id,
      from_state: fromState,
      to_state: targetState,
    });
  }
}
```

**Use case loads data → hydrates aggregate → validates → persists → publishes events:**

```typescript
// src/contexts/candidate/application/use-cases/ManageCandidates.ts
async transition(id: UUID, targetState: CandidateState): Promise<CandidateData> {
  const data = await this.repo.findById(id);
  if (!data) throw new NotFoundError("Candidate", id);

  const candidate = new Candidate(data);
  candidate.transitionTo(targetState);  // domain validates

  const updated = await this.repo.updateState(id, targetState);
  await eventBus.publishAll(candidate.domainEvents);
  return updated;
}
```

### 2. Cross-Context Integration via Lazy Import

**Problem:** Importing another context's composition root at module level creates circular dependencies.

**Solution:** Define a port interface, implement an adapter with lazy `await import()` inside methods.

```typescript
// Port: src/contexts/candidate/application/ports/ScenarioReader.ts
export interface ScenarioReader {
  exists(scenarioTypeId: UUID): Promise<boolean>;
}

// Adapter: src/contexts/candidate/infrastructure/ScenarioContextAdapter.ts
export class ScenarioContextAdapter implements ScenarioReader {
  async exists(scenarioTypeId: UUID): Promise<boolean> {
    const { manageScenarioTypes } = await import("@/contexts/scenario");
    try {
      await manageScenarioTypes.get(scenarioTypeId);
      return true;
    } catch {
      return false;
    }
  }
}
```

**Rule:** Never `import` from `@/contexts/<other>` at the top of a file. Always lazy inside a method.

### 3. Drizzle Pagination Pattern

Two-query approach: count for total, then data with offset/limit.

```typescript
// src/contexts/candidate/infrastructure/DrizzleCandidateRepository.ts
async list(filter: ListCandidatesFilter, page: number, pageSize: number): Promise<ListCandidatesResult> {
  const conditions = [];
  if (filter.state) conditions.push(eq(cdCandidates.state, filter.state));
  if (filter.scenarioTypeId) conditions.push(eq(cdCandidates.scenarioTypeId, filter.scenarioTypeId));
  if (filter.episodeId) conditions.push(eq(cdCandidates.episodeId, filter.episodeId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await this.db.select({ value: count() }).from(cdCandidates).where(where);
  const total = totalResult?.value ?? 0;

  const offset = (page - 1) * pageSize;
  const rows = await this.db
    .select().from(cdCandidates).where(where)
    .orderBy(desc(cdCandidates.createdAt))
    .limit(pageSize).offset(offset);

  return { data: rows as CandidateData[], total };
}
```

**API route uses `parseQuery` + `paginated` response helper:**

```typescript
// app/api/v1/candidates/route.ts
const listSchema = z.object({
  state: z.enum(CANDIDATE_STATES).optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(50),
});

export const GET = withApiMiddleware(async (req: NextRequest) => {
  const query = parseQuery(req, listSchema);
  const { data, total } = await manageCandidates.list(
    filter,
    query.page,
    query.page_size
  );
  return paginated(data, total, query.page, query.page_size);
});
```

### 4. Idempotent Event Handlers

Event handlers must handle redelivery gracefully — catch expected errors and return early.

**Pattern A — Duplicate creation (catch DuplicateError):**

```typescript
// src/contexts/candidate/application/handlers/onEpisodeIngested.ts
export async function onEpisodeIngested(event: DomainEvent): Promise<void> {
  try {
    await manageCandidates.create({ episode_id, scenario_type_id });
  } catch (error) {
    if (error instanceof DuplicateError) return; // already exists — no-op
    throw error;
  }
}
```

**Pattern B — Invalid state transition (catch InvalidStateTransitionError):**

```typescript
// src/contexts/candidate/application/handlers/onLabelTaskFinalized.ts
export async function onLabelTaskFinalized(event: DomainEvent): Promise<void> {
  try {
    await manageCandidates.transition(candidate_id as UUID, "labeled");
  } catch (error) {
    if (
      error instanceof NotFoundError ||
      error instanceof InvalidStateTransitionError
    ) {
      console.warn(
        `[onLabelTaskFinalized] Skipping: ${(error as Error).message}`
      );
      return;
    }
    throw error;
  }
}
```

### 5. State as varchar, Not pgEnum

Matches project convention. New states can be added without ALTER TYPE migrations.

- Define valid values in TypeScript: `export const CANDIDATE_STATES = ["raw", ...] as const`
- Validate with Zod: `z.enum(CANDIDATE_STATES)`
- Enforce at domain level: `VALID_TRANSITIONS` map
- Store as `varchar({ length: 20 })` in Drizzle schema

## Gotcha: First `db:generate` After `db:push`

When existing schema was created via `db:push` and `db:generate` runs for the first time, the migration includes ALL tables (not just new ones). This causes failures when migrating against an existing database.

**Workaround:** Apply the new table's SQL directly via `psql`, or edit the generated migration to remove existing table definitions.

**Prevention:** Decide early whether to use `db:push` (dev) or `db:generate`+`db:migrate` (production). Don't mix them.

## Bounded Context Implementation Checklist

For future contexts, follow this order:

1. **Schema:** `src/db/schema/{context}.ts` + update `index.ts` export
2. **Domain:** entities, errors, events, value objects under `src/contexts/{context}/domain/`
3. **Ports:** repository interface + cross-context reader interfaces under `application/ports/`
4. **Infrastructure:** Drizzle repository + cross-context adapters (lazy import) under `infrastructure/`
5. **Use cases:** under `application/use-cases/` — inject repo + adapters via constructor
6. **Composition root:** `src/contexts/{context}/index.ts` — wire everything, export use-case singletons
7. **API routes:** `app/api/v1/{resource}/` — wrap with `withApiMiddleware`, use response helpers
8. **Event handlers:** under `application/handlers/` — register in `src/lib/events/registry.ts`
9. **Verify:** `pnpm lint` + `pnpm build` + `db:generate`/`db:push`
