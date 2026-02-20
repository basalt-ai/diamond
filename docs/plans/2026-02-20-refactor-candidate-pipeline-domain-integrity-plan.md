---
title: "Refactor: Candidate Pipeline Domain Integrity"
type: refactor
status: completed
date: 2026-02-20
---

# Refactor: Candidate Pipeline Domain Integrity

## Enhancement Summary

**Deepened on:** 2026-02-20
**Sections enhanced:** 6
**Research agents used:** TypeScript reviewer, pattern recognition, architecture strategist, performance oracle, code simplicity reviewer, DDD best practices researcher

### Key Improvements

1. Removed unnecessary `applyEmbedding()` entity method — reuse existing `markEmbedded()`, skip aggregate hydration entirely
2. Fixed type mismatch (`Record<string, number>` → `Record<string, unknown>`) and `this.toData()` compile error
3. Simplified use-case to single `updateWithScoring` call reading from aggregate getters, not raw params
4. Added `applyScoring()` return type for clean use-case branching without `domainEvents.length` inspection
5. Identified `onCandidateCreated` pg-boss duplication risk when wiring registry in worker — added mitigation
6. Static import for `manageCandidates` in worker instead of per-job dynamic import

### New Considerations Discovered

- Worker registry import causes `onCandidateCreated` to create a redundant pg-boss client via `getJobClient()`
- `onScenarioGraphUpdated` handler does direct SQL on `cdCandidates` — same bypass being fixed here
- `RETURNING *` on JSONB columns transfers unnecessary data since the worker discards the result

---

## Overview

The candidate state transition pipeline (`raw → scored`) currently bypasses the domain model in `scripts/worker.ts`, doing direct SQL updates that skip aggregate validation, domain event publishing, and the load-hydrate-validate-persist-publish pattern. This refactor routes all state transitions through the `Candidate` aggregate to ensure domain integrity, proper event flow, and a single code path shared by all pipeline modes (manual, batch, streaming).

## Problem Statement

**Direct SQL bypasses in `scripts/worker.ts`:**

1. `embedding.compute` handler sets `embeddedAt` via raw SQL — bypasses `Candidate.markEmbedded()`
2. `scoring.compute` handler sets `scores`, `features`, `scenarioTypeId`, `mappingConfidence`, `scoringDirty`, and `state` via raw SQL — bypasses `Candidate.transitionTo("scored")` and never publishes `candidate.state_changed`

**Why this is a problem:**

- No `candidate.state_changed` event for `raw → scored` — future handlers (e.g., auto-selection) would silently fail
- No state machine validation — any state can be written directly
- The worker's `InProcessEventBus` has zero subscribers (no `registry.ts` import), so even if events were published they'd be lost
- `CandidateRepository.updateState()` only sets `state + updatedAt` — no way to atomically persist scoring fields through the domain

**Why it happened:** The repository port didn't support multi-field atomic writes, so the worker took the shortcut.

## Proposed Solution

### Phase 1: Extend the Domain Model

Add `applyScoring()` to `Candidate` entity and `updateWithScoring()` / `updateEmbedding()` to `CandidateRepository` port.

### Phase 2: Route Worker Through Domain

Replace direct SQL in `worker.ts` with use-case calls. Use static imports for frequently-called use cases.

### Phase 3: Wire Event Registry in Worker

Import `registry.ts` in the worker process so domain events reach their subscribers. Mitigate the `onCandidateCreated` pg-boss duplication.

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Pipeline Modes (all share the same domain path)         │
│                                                         │
│  Manual (PATCH)  │  Worker (pg-boss)  │  Future Stream  │
│        │                  │                    │        │
│        └──────────┬───────┘────────────────────┘        │
│                   ▼                                     │
│  ManageCandidates.applyScoring(id, payload)              │
│        │                                                │
│        ▼                                                │
│  Candidate.applyScoring(scores, features, mapping)       │
│    → sets fields + transitionTo("scored")                │
│    → returns "transitioned" | "rescored" | "skipped"     │
│        │                                                │
│        ▼                                                │
│  CandidateRepository.updateWithScoring(id, data)         │
│    → atomic SQL update of all fields + state             │
│        │                                                │
│        ▼                                                │
│  eventBus.publishAll(domainEvents)                       │
│    → candidate.state_changed reaches subscribers         │
└─────────────────────────────────────────────────────────┘
```

### Research Insights

**Idempotent State Transitions (Event-Driven.io, Vaughn Vernon):**

- Distinguish "illegal transition" from "already done" — already-done transitions return silently, no event emitted
- The `transitionTo()` method itself should have `if (this._state === targetState) return` as a first-line guard
- This prevents DLQ poisoning from pg-boss retries

**Rich Domain Methods (Khalil Stemmler, Vernon):**

- State transition methods should own both field updates AND the transition — callers cannot transition without providing required data
- This enforces invariants like "a candidate cannot be `scored` without populated scores"

**Repository Atomicity (Sentry, DDD Community):**

- A single `save(aggregate)` or narrow `updateWithScoring()` method ensures all fields are written atomically in one SQL UPDATE
- No transaction wrapper needed for single-aggregate mutations

### Implementation Phases

#### Phase 1: Domain & Repository Extensions

**1.1 Add `applyScoring()` to `Candidate` entity**

`src/contexts/candidate/domain/entities/Candidate.ts`

Returns a discriminated result so the use-case doesn't need to inspect `domainEvents.length`:

```typescript
type ApplyScoringResult = "transitioned" | "rescored" | "skipped";

applyScoring(params: {
  scores: Record<string, unknown>;
  features: Record<string, unknown>;
  scenarioTypeId: UUID | null;
  mappingConfidence: number;
}): ApplyScoringResult {
  // Idempotency: already scored — overwrite scores, no event, no re-transition
  if (this._state === "scored") {
    this._scores = params.scores;
    this._features = params.features;
    this._scenarioTypeId = params.scenarioTypeId ?? this._scenarioTypeId;
    this._mappingConfidence = params.mappingConfidence;
    this._scoringDirty = false;
    this._updatedAt = new Date();
    return "rescored";
  }

  // Guard: only raw → scored is valid. Past scored = no-op.
  if (this._state !== "raw") {
    return "skipped";
  }

  this._scores = params.scores;
  this._features = params.features;
  this._scenarioTypeId = params.scenarioTypeId ?? this._scenarioTypeId;
  this._mappingConfidence = params.mappingConfidence;
  this._scoringDirty = false;
  this.transitionTo("scored");
  return "transitioned";
}
```

#### Research Insights — Phase 1.1

**Type safety:** `scores` must be `Record<string, unknown>` to match `CandidateData.scores` and the entity's `_scores` field. The scoring engine returns `Record<string, number>` but this is assignable to `Record<string, unknown>`.

**Null-coalescing for `scenarioTypeId`:** The `??` fallback lives inside the entity method — the use-case should NOT duplicate this logic.

**No separate `applyEmbedding()` entity method needed.** The existing `markEmbedded()` at `Candidate.ts:106` is identical. Embedding is infrastructure (setting a timestamp), not a business state transition. The use-case skips aggregate hydration entirely.

---

**1.2 Extend `CandidateRepository` port**

`src/contexts/candidate/application/ports/CandidateRepository.ts`

```typescript
export interface CandidateRepository {
  // ... existing methods ...
  updateWithScoring(
    id: UUID,
    data: {
      state: CandidateState;
      scores: Record<string, unknown>;
      features: Record<string, unknown>;
      scenarioTypeId: UUID | null;
      mappingConfidence: number;
    }
  ): Promise<void>;

  updateEmbedding(id: UUID, embeddedAt: Date): Promise<void>;
}
```

#### Research Insights — Phase 1.2

**`scoringDirty` removed from params** — it is always `false` after scoring. Hardcoded in the implementation to prevent misuse.

**Return type is `void`, not `CandidateData`** — the worker discards the return value. Avoids deserializing large JSONB `scores`/`features` payloads via `RETURNING *` on every scoring completion. The repository throws `NotFoundError` on zero rows matched.

---

**1.3 Implement in `DrizzleCandidateRepository`**

`src/contexts/candidate/infrastructure/DrizzleCandidateRepository.ts`

```typescript
async updateWithScoring(id: UUID, data: {
  state: CandidateState;
  scores: Record<string, unknown>;
  features: Record<string, unknown>;
  scenarioTypeId: UUID | null;
  mappingConfidence: number;
}): Promise<void> {
  const result = await this.db
    .update(cdCandidates)
    .set({
      state: data.state,
      scores: data.scores,
      features: data.features,
      scenarioTypeId: data.scenarioTypeId,
      mappingConfidence: data.mappingConfidence,
      scoringDirty: false,
      updatedAt: new Date(),
    })
    .where(eq(cdCandidates.id, id));
  if (result.rowCount === 0) throw new NotFoundError("Candidate", id);
}

async updateEmbedding(id: UUID, embeddedAt: Date): Promise<void> {
  const result = await this.db
    .update(cdCandidates)
    .set({ embeddedAt, updatedAt: new Date() })
    .where(eq(cdCandidates.id, id));
  if (result.rowCount === 0) throw new NotFoundError("Candidate", id);
}
```

#### Research Insights — Phase 1.3

**No `.returning()` call** — avoids transferring full JSONB payloads back over the wire. Uses `result.rowCount` for not-found detection instead.

**No `this.toData(row)` call** — the existing repository uses `row as CandidateData` cast pattern; `toData()` does not exist on the class. Since we return `void`, this is moot.

---

**1.4 Add use-case methods to `ManageCandidates`**

`src/contexts/candidate/application/use-cases/ManageCandidates.ts`

```typescript
async applyScoring(id: UUID, params: {
  scores: Record<string, unknown>;
  features: Record<string, unknown>;
  scenarioTypeId: UUID | null;
  mappingConfidence: number;
}): Promise<void> {
  const data = await this.repo.findById(id);
  if (!data) throw new NotFoundError("Candidate", id);

  const candidate = new Candidate(data);
  const result = candidate.applyScoring(params);

  if (result === "skipped") return;

  await this.repo.updateWithScoring(id, {
    state: candidate.state,
    scores: candidate.scores,
    features: candidate.features,
    scenarioTypeId: candidate.scenarioTypeId,
    mappingConfidence: candidate.mappingConfidence,
  });

  await eventBus.publishAll(candidate.domainEvents);
}

async applyEmbedding(id: UUID): Promise<void> {
  // No aggregate hydration needed — embedding is infrastructure, not a domain concern
  await this.repo.updateEmbedding(id, new Date());
}
```

#### Research Insights — Phase 1.4

**Single `updateWithScoring` call** — the discriminated return from `applyScoring()` eliminates the dual-branch logic. When `result === "rescored"`, `candidate.domainEvents` is empty so `publishAll` is a no-op.

**Reads from aggregate getters, not raw params** — `candidate.scores`, `candidate.scenarioTypeId` etc. The aggregate is the source of truth after mutation (e.g., the `??` fallback for `scenarioTypeId` lives in the entity).

**`applyEmbedding` skips aggregate hydration entirely** — `markEmbedded()` adds no domain validation or events. Calling `repo.updateEmbedding(id, new Date())` directly saves one DB round-trip.

**Throws `NotFoundError` instead of returning `null`** — consistent with existing `get()`, `transition()` methods on `ManageCandidates`. The worker catches `NotFoundError` and logs a warning.

---

**1.5 Export from composition root**

`src/contexts/candidate/index.ts` — `manageCandidates` already exported, no change needed.

#### Phase 2: Refactor Worker

**2.1 Static import for `manageCandidates`**

Add to top of `scripts/worker.ts` (static, not dynamic — called on every job):

```typescript
import { manageCandidates } from "../src/contexts/candidate";
```

#### Research Insights — Phase 2.1

**Static, not dynamic import** — `manageCandidates` is used in both `embedding.compute` and `scoring.compute` handlers (every job). Dynamic `await import()` on every job is unnecessary overhead. The existing `cluster.detect` handler uses dynamic import because it imports a heavy, infrequently-used module. `manageCandidates` is lightweight and always needed.

---

**2.2 Replace direct SQL in `embedding.compute` handler**

`scripts/worker.ts` — replace:

```typescript
// BEFORE (direct SQL)
await db
  .update(cdCandidates)
  .set({ embeddedAt: new Date(), updatedAt: new Date() })
  .where(eq(cdCandidates.id, candidateId));
```

With:

```typescript
// AFTER (through domain)
await manageCandidates.applyEmbedding(candidateId);
```

**2.3 Replace direct SQL in `scoring.compute` handler**

Replace the entire scoring update block:

```typescript
// BEFORE (direct SQL)
await db
  .update(cdCandidates)
  .set({
    scores,
    features,
    scenarioTypeId,
    mappingConfidence,
    scoringDirty: false,
    state: "scored",
    updatedAt: new Date(),
  })
  .where(eq(cdCandidates.id, candidateId));
```

With:

```typescript
// AFTER (through domain)
try {
  await manageCandidates.applyScoring(candidateId, {
    scores,
    features,
    scenarioTypeId,
    mappingConfidence,
  });
} catch (error) {
  if (error instanceof NotFoundError) {
    console.warn(`[worker] Candidate ${candidateId} not found, skipping`);
    return;
  }
  throw error;
}
```

#### Research Insights — Phase 2.3

**Error handling follows the idempotent handler pattern** from `docs/solutions/integration-issues/candidate-context-ddd-implementation-patterns.md` — catch `NotFoundError` and return (no-op), re-throw everything else for pg-boss retry.

---

**2.4 Add singletonKey to scoring job enqueue**

In the `embedding.compute` handler, add a singletonKey to prevent duplicate scoring jobs on retry:

```typescript
await boss.send(
  QUEUES.SCORING_COMPUTE,
  {
    candidateId,
    runId: "auto",
  },
  {
    singletonKey: `score-${candidateId}`,
  }
);
```

#### Research Insights — Phase 2.4

**Prevents duplicate scoring on embedding retry** — currently the embedding handler has a `singletonKey` for itself (`embed-<id>`) but no singleton guard on the downstream `SCORING_COMPUTE` enqueue. If an embedding job is retried after successfully embedding but before acknowledging, a second scoring job is enqueued. The `singletonKey` here mirrors the established pattern.

---

**2.5 Remove unused imports**

After removing direct SQL, clean up: `eq` from `drizzle-orm` (unless still needed for `cluster.detect`), `cdCandidates` from schema (unless still needed for `cluster.detect` count query). Keep `isNull` and `sql` if `cluster.detect` still uses them.

#### Phase 3: Wire Event Registry in Worker

**3.1 Import registry in worker**

Add to top of `scripts/worker.ts`:

```typescript
import "../src/lib/events/registry";
```

This ensures the `InProcessEventBus` singleton in the worker process has all the same subscribers as in the Next.js process.

#### Research Insights — Phase 3.1

**Process-boundary semantics:** The `InProcessEventBus` is a module-level singleton scoped to the current Node.js process. The worker and Next.js server each have their own independent instance. Events published in the worker only reach worker-side subscribers, and vice versa. pg-boss remains the cross-process communication channel.

**`ensureRegistry()` redundancy:** `InProcessEventBus.publish()` already calls `await this.ensureRegistry()` which lazily imports `registry.ts`. The explicit top-level import makes the dependency visible and ensures subscribers are registered before the first event, avoiding a race.

**Duplicate infrastructure instances:** When `registry.ts` loads, its static handler imports pull in composition roots (`src/contexts/candidate/index.ts`, `src/contexts/labeling/index.ts`, etc.). These instantiate adapters and repositories. Since `src/db/index.ts` exports a module-level singleton `db`, the database pool is shared — no connection duplication. Verify this assumption during implementation.

---

**3.2 Mitigate `onCandidateCreated` pg-boss duplication**

`onCandidateCreated` calls `getJobClient()`, which creates a separate `PgBoss` instance. In the worker, this creates a redundant connection since the worker already has its own `boss` instance.

**Mitigation:** This is acceptable for now — `onCandidateCreated` only fires when a new candidate is created via `manageCandidates.create()`, which happens via the `onEpisodeIngested` handler, not during the scoring pipeline. The redundant pg-boss instance is lazy-initialized and only created if a `candidate.created` event fires in the worker. For this refactor's scope (embedding + scoring handlers), it won't fire.

**Future fix (deferred):** Make `getJobClient()` accept an optional injected `PgBoss` instance, or create a `workerRegistry.ts` that omits `onCandidateCreated`.

---

**3.3 Verify handler safety**

Confirm these handlers are safe to run in a plain Node.js process (no Next.js deps):

- `onEpisodeIngested` — calls `manageCandidates.create()` ✓
- `onLabelTaskFinalized` — calls `manageCandidates.transition()` ✓
- `onCandidateCreated` — enqueues pg-boss job via `getJobClient()` ✓ (lazy, won't fire in scoring path)
- `onCandidateSelected` — calls `manageLabelTasks.create()` ✓
- `onRubricVersionCreated` — labeling context internal ✓
- `onScenarioGraphUpdated` — intelligence context internal ✓ (but does direct SQL — see Open Questions)
- `onClusteringRunCompleted` — intelligence context internal ✓
- `onDatasetVersionReleased` — export context internal ✓

All use DI via adapters — no Next.js API dependencies.

#### Research Insights — Phase 3.3

**Manual verification step:** Before merging, trace the full static import graph of `registry.ts` to confirm no transitive Next.js-only imports (`next/headers`, `next/navigation`, etc.). Run the worker process with `node --check` or a simple startup test.

## Acceptance Criteria

### Functional Requirements

- [x] `Candidate.applyScoring()` validates state machine (only `raw → scored` allowed)
- [x] `Candidate.applyScoring()` is idempotent (re-scoring already-scored candidate overwrites scores without error)
- [x] `Candidate.applyScoring()` silently skips candidates past `scored` state (returns `"skipped"`)
- [x] `ManageCandidates.applyScoring()` follows load-hydrate-validate-persist-publish pattern
- [x] `ManageCandidates.applyScoring()` reads from aggregate getters, not raw params
- [x] `CandidateRepository.updateWithScoring()` atomically persists all scoring fields + state
- [x] Worker `embedding.compute` handler uses `manageCandidates.applyEmbedding()` instead of direct SQL
- [x] Worker `scoring.compute` handler uses `manageCandidates.applyScoring()` instead of direct SQL
- [x] `candidate.state_changed` event is published for `raw → scored` transitions
- [x] Event registry is loaded in worker process
- [x] Scoring job has `singletonKey` to prevent duplicates on retry
- [x] Worker uses static import for `manageCandidates`
- [x] Verify no Next.js-only transitive imports when registry loads in worker
- [x] `pnpm lint` passes
- [x] `pnpm build` passes

### Non-Functional Requirements

- [x] No behavioral change for end users — same scoring results, same state transitions
- [x] Worker retry safety — pg-boss retries do not cause errors or DLQ poisoning
- [x] No `.returning()` on JSONB updates — avoid unnecessary wire overhead

## Performance Considerations

**Query count delta per job:**

| Job                 | Current queries | After refactor | Delta                              |
| ------------------- | --------------- | -------------- | ---------------------------------- |
| `embedding.compute` | 4               | 4              | 0 (skipped aggregate hydration)    |
| `scoring.compute`   | 5               | 6              | +1 SELECT (`findById` in use-case) |

The +1 SELECT for scoring is ~1ms per job. At 5 concurrent workers processing 1,000 candidates, this adds under 1 second total — negligible against OpenAI embedding latency (200-500ms per call) which is the actual throughput bottleneck.

**Future optimization (deferred):** Accept pre-fetched `CandidateData` in `applyScoring()` to eliminate the redundant `findById`, since the worker already loads the candidate via `candidateReader.findById()` as a guard check.

## Files to Modify

| File                                                                  | Change                                                                                      |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `src/contexts/candidate/domain/entities/Candidate.ts`                 | Add `applyScoring()` method with discriminated return type                                  |
| `src/contexts/candidate/application/ports/CandidateRepository.ts`     | Add `updateWithScoring()`, `updateEmbedding()`                                              |
| `src/contexts/candidate/infrastructure/DrizzleCandidateRepository.ts` | Implement new port methods (no `.returning()`)                                              |
| `src/contexts/candidate/application/use-cases/ManageCandidates.ts`    | Add `applyScoring()`, `applyEmbedding()` use-case methods                                   |
| `scripts/worker.ts`                                                   | Static import for `manageCandidates`, replace direct SQL, import registry, add singletonKey |

## Open Questions (Deferred)

These are real gaps identified during analysis but are out of scope for this refactor:

1. **`scoringDirty` semantics** — Currently set to `false` on scoring, but scorers use stubs (`CoverageGainScorer`, `RiskWeightScorer` return zeros). When real scorers are wired, how do we identify candidates that need re-scoring? Consider a `scoringVersion` field later.

2. **`selectionRunId` setter** — The `scored → selected` transition will need to set `selectionRunId` atomically. Add `applySelection(runId)` method when that pipeline is built.

3. **Transactional outbox** — The current pattern (persist then publish) is not transactional. If the process crashes between persist and publish, events are lost. For now this matches the existing behavior across all use cases. A transactional outbox with `domain_event_outbox` table and `FOR UPDATE SKIP LOCKED` polling can be added later as a cross-cutting concern.

4. **DLQ monitoring** — `embedding.dlq` and `scoring.dlq` have no handlers or alerts. Candidates stuck in `raw` state due to DLQ'd jobs are invisible.

5. **`updateState` retirement** — After this refactor, `updateState` only handles non-scoring transitions. Consider replacing it with richer methods (e.g., `applySelection`, `validateLabeling`) as each pipeline stage is automated, eventually deprecating the generic `updateState`.

6. **`onScenarioGraphUpdated` direct SQL bypass** — This handler in the intelligence context does `db.update(cdCandidates)` directly, the same category of bypass this refactor fixes. Now that the registry is wired in the worker, this handler runs there too. Should be refactored to go through `ManageCandidates` in a follow-on.

7. **`onCandidateCreated` pg-boss duplication in worker** — `getJobClient()` creates a separate `PgBoss` instance. Make it accept an injected instance or create a `workerRegistry.ts` that omits this handler.

## References

- `src/contexts/candidate/domain/entities/Candidate.ts` — aggregate root with state machine
- `src/contexts/candidate/application/use-cases/ManageCandidates.ts` — existing use cases
- `scripts/worker.ts` — current worker with direct SQL
- `src/lib/events/registry.ts` — event subscription wiring
- `docs/solutions/integration-issues/candidate-context-ddd-implementation-patterns.md` — DDD patterns
- `docs/solutions/integration-issues/labeling-context-annotation-workflow-patterns.md` — convenience method pattern

### External References

- [Idempotent Command Handling — Event-Driven.io](https://event-driven.io/en/idempotent_command_handling/)
- [Updating Aggregates in DDD — Khalil Stemmler](https://khalilstemmler.com/articles/typescript-domain-driven-design/updating-aggregates-in-domain-driven-design/)
- [Transactional Outbox Pattern — Antman Does Software](https://antman-does-software.com/implementing-the-outbox-pattern-in-nodejs-and-postgres)
- [Atomic Repositories in Clean Architecture — Sentry](https://blog.sentry.io/atomic-repositories-in-clean-architecture-and-typescript/)
- [Drizzle ORM Transaction Typing — Discussion #3271](https://github.com/drizzle-team/drizzle-orm/discussions/3271)
