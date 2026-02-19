---
title: "Bounded Context DDD Implementation Patterns — Scenario Context"
date: 2026-02-19
category: integration-issues
tags:
  - ddd
  - hexagonal-architecture
  - bounded-context
  - drizzle-orm
  - zod-v4
  - graph-versioning
  - next-js-16
  - api-routes
severity: medium
component: src/contexts/scenario
symptoms:
  - Zod v4 z.record() fails with "Expected 2-3 arguments, but got 1"
  - PG NOTICE about identifier truncation on long constraint names
  - drizzle-kit push fails without DATABASE_URL explicitly set
  - Drizzle self-referential relation errors without relationName
---

# Bounded Context DDD Implementation Patterns — Scenario Context

## Context

The Scenario context is the first bounded context implemented in Diamond 2.0. It establishes the canonical hexagonal architecture pattern that all subsequent contexts (Candidate, Labeling, Dataset, Ingestion, Reporting) must follow. This document captures the patterns, gotchas, and checklists derived from the implementation.

The context owns 8 database tables (`sc_` prefix), 5 entity types, 13 API endpoints, and an immutable graph versioning system that creates denormalized snapshots on every taxonomy mutation.

## Solution & Patterns Established

### Canonical Bounded Context Directory Structure

```
src/contexts/scenario/
  index.ts                          # Barrel: wires repos, services, use-case singletons
  application/
    GraphVersioningService.ts       # Creates snapshots + publishes events
    ports/
      ScenarioRepository.ts         # Interface for scenario persistence
      RubricRepository.ts           # Interface for rubric persistence
      GraphRepository.ts            # Interface for graph persistence
    use-cases/
      ManageFailureModes.ts         # CRUD + graph versioning
      ManageRiskTiers.ts
      ManageContextProfiles.ts
      ManageScenarioTypes.ts        # Includes cycle detection
      ManageRubrics.ts              # Version management + inheritance
      ReadScenarioGraph.ts          # Read-only, no graph versioning
  domain/
    entities/
      FailureMode.ts                # Pure types (no classes)
      RiskTier.ts
      ContextProfile.ts
      ScenarioType.ts
      Rubric.ts
      ScenarioGraph.ts
    errors.ts                       # Context-specific DomainError subclasses
    events.ts                       # Typed domain event definitions
  infrastructure/
    DrizzleScenarioRepository.ts    # Implements ScenarioRepository
    DrizzleRubricRepository.ts      # Implements RubricRepository
    DrizzleGraphRepository.ts       # Implements GraphRepository

src/db/schema/scenario.ts           # One file per context; all tables prefixed sc_
```

### Request Flow Pattern

```
HTTP Request
  → app/api/v1/{resource}/route.ts
      withApiMiddleware(handler)       # HOF wraps every export
        parseBody(req, zodSchema)      # Throws ApiError on validation failure
        use-case.method(input)         # Pure application logic
          repo.dbOp()                  # Throws NotFoundError, DuplicateError, etc.
          graphVersioning.createVersionAfterChange([...])  # Post-mutation side-effect
        return ok(result) | created(result) | noContent()
  ← NextResponse.json envelope
```

Error mapping in `withApiMiddleware`:

| Error class                                                                                            | HTTP status           |
| ------------------------------------------------------------------------------------------------------ | --------------------- |
| `NotFoundError`                                                                                        | 404                   |
| `ReferenceIntegrityError`, `ConcurrencyConflictError`, `DuplicateError`, `InvalidStateTransitionError` | 409                   |
| Any other `DomainError` (including `CycleDetectedError`)                                               | 422                   |
| `ApiError`                                                                                             | its own `.statusCode` |
| Unhandled                                                                                              | 500                   |

### Graph Versioning Wiring

`GraphVersioningService` is constructed once in the barrel and injected into every mutating use case:

```typescript
// src/contexts/scenario/index.ts
const graphVersioning = new GraphVersioningService(graphRepo);
export const manageFailureModes = new ManageFailureModes(
  scenarioRepo,
  graphVersioning
);
```

Every mutating method calls `graphVersioning.createVersionAfterChange` **after** the repository write. The service:

1. Fetches the current version number
2. Builds a full denormalized graph snapshot
3. Persists a new `sc_scenario_graph_versions` row
4. Publishes a `scenario_graph.updated` domain event

```typescript
// Canonical mutation pattern
async create(input: CreateFailureModeInput): Promise<FailureModeData> {
  const result = await this.repo.createFailureMode(input);
  await this.graphVersioning.createVersionAfterChange([{
    changeType: "added",
    entityType: "failure_mode",
    entityId: result.id,
    summary: `Added failure mode "${result.name}"`,
  }]);
  return result;
}
```

### Key Code Patterns

**Repository — `returning()` + null guard:**

```typescript
const [row] = await this.db
  .delete(scFailureModes)
  .where(eq(scFailureModes.id, id))
  .returning({ id: scFailureModes.id });
if (!row) throw new NotFoundError("FailureMode", id);
```

**Many-to-many updates (replace-all strategy):**

```typescript
await this.db
  .delete(scScenarioTypeFailureModes)
  .where(eq(scScenarioTypeFailureModes.scenarioTypeId, id));
if (failureModeIds.length > 0) {
  await this.db.insert(scScenarioTypeFailureModes).values(
    failureModeIds.map((fmId) => ({
      scenarioTypeId: id,
      failureModeId: fmId,
    }))
  );
}
```

**Recursive CTE for ancestor lookup (cycle detection):**

```typescript
const result = await this.db.execute(sql`
  WITH RECURSIVE ancestors AS (
    SELECT parent_id FROM sc_scenario_types WHERE id = ${id}
    UNION ALL
    SELECT st.parent_id FROM sc_scenario_types st
    JOIN ancestors a ON st.id = a.parent_id
    WHERE a.parent_id IS NOT NULL
  )
  SELECT parent_id FROM ancestors WHERE parent_id IS NOT NULL
`);
```

**Next.js 16 route params are a Promise:**

```typescript
export const GET = withApiMiddleware(async (_req, ctx) => {
  const { id } = await ctx.params; // must be awaited
  return ok(await manageFailureModes.get(id as UUID));
});
```

## Gotchas Encountered

### 1. Zod v4 `z.record()` Requires Two Arguments

```typescript
// BROKEN (Zod v3 syntax)
attributes: z.record(z.unknown()).optional();

// FIXED (Zod v4)
attributes: z.record(z.string(), z.unknown()).optional();
```

TypeScript error: `Expected 2-3 arguments, but got 1`. Always pass both key and value schemas.

### 2. Drizzle Self-Referential Relations Need `relationName`

Without `relationName`, Drizzle cannot distinguish the two directions of a self-reference:

```typescript
parent: one(scScenarioTypes, {
  fields: [scScenarioTypes.parentId],
  references: [scScenarioTypes.id],
  relationName: "parentChild",  // REQUIRED
}),
children: many(scScenarioTypes, { relationName: "parentChild" }),
```

### 3. PG Constraint Name Truncation Is Cosmetic

Long join table names like `sc_scenario_type_context_profiles_scenario_type_id_context_profile_id_pk` get truncated to 63 characters. This is a NOTICE, not an error — constraints still work.

### 4. `drizzle-kit push` Needs Explicit DATABASE_URL

`.env.local` is NOT auto-loaded by drizzle-kit:

```bash
source .env.local && DATABASE_URL="$DATABASE_URL" pnpm db:push
```

### 5. `withApiMiddleware` Must Import Context-Specific Errors

Custom `DomainError` subclasses that need non-422 HTTP status codes must be explicitly imported and mapped in `src/lib/api/middleware.ts`. The `DomainError` catch-all defaults to 422.

## Prevention Checklist for Next Bounded Context

### Database & Schema

- [ ] Context namespace prefix defined (2-3 letters + underscore)
- [ ] Schema file at `src/db/schema/{context}.ts`
- [ ] `src/db/schema/index.ts` updated with `export * from "./{context}"`
- [ ] Self-referential relations include `relationName` on both sides
- [ ] DATABASE_URL explicitly loaded before `pnpm db:push`

### Domain & Application

- [ ] Domain errors extend `DomainError` from `@/lib/domain/DomainError`
- [ ] Context-specific errors mapped in `src/lib/api/middleware.ts` (if non-422)
- [ ] Every mutation path calls `graphVersioning.createVersionAfterChange()`
- [ ] Port interfaces defined before concrete Drizzle implementations

### Zod Validation

- [ ] Import as `import { z } from "zod"` (not `zod/v4`)
- [ ] `z.record()` always has 2 args: `z.record(z.string(), z.unknown())`
- [ ] Boolean query params: `z.enum(["true", "false"]).transform(v => v === "true")`

### API Routes

- [ ] All handlers wrapped with `withApiMiddleware()`
- [ ] Response helpers: `created()` for 201, `ok()` for 200, `noContent()` for 204
- [ ] Routes at `app/api/v1/{context-name}/` (kebab-case plurals)

### Final Checks

- [ ] `pnpm lint:fix` passes
- [ ] `pnpm build` succeeds (TypeScript strict + noUncheckedIndexedAccess)

## Related Documentation

- [Infrastructure scaffolding gotchas](nextjs16-infrastructure-scaffolding-gotchas.md) — foundational Next.js 16, Drizzle, Zod v4 gotchas
- [Infrastructure plan](../../plans/2026-02-19-feat-infrastructure-project-scaffolding-plan.md) — base architecture (Phases 1–8)
- [Scenario context plan](../../plans/2026-02-19-feat-scenario-taxonomy-graph-versioning-plan.md) — full design decisions, schema ERD, API surface
