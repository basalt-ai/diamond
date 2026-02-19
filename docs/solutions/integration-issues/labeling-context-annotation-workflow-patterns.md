---
title: Labeling Context — Annotation Workflow Implementation Patterns
date: 2026-02-19
category: integration-issues
tags: [zod-v4, ddd, state-machine, labeling-context, agreement-calculation, cross-context-adapters, drizzle, label-versioning]
severity: medium
components: [src/contexts/labeling, src/db/schema/labeling, app/api/v1/label-tasks, app/api/v1/labels]
root_cause: Zod v4 API differences and label versioning ordering requirements
resolution_type: implementation-pattern
linear_epic: GET-9
---

# Labeling Context — Annotation Workflow Implementation Patterns

Patterns and gotchas from implementing the 3rd bounded context (Labeling) in the Diamond DDD architecture. Builds on patterns established by Scenario (1st) and Candidate (2nd) contexts.

## New Bounded Context Checklist

Follow this order when adding a new bounded context:

1. Create `src/db/schema/{context}.ts` with prefixed table names (e.g., `lb_` for labeling)
2. Export from `src/db/schema/index.ts`
3. Create domain entities, value objects, errors, events under `src/contexts/{context}/domain/`
4. Define outbound port interfaces in `src/contexts/{context}/application/ports/`
5. Implement use cases that depend only on port interfaces
6. Implement Drizzle repositories and cross-context adapters in `infrastructure/`
7. Create composition root at `src/contexts/{context}/index.ts`
8. Wire API routes in `app/api/v1/`
9. Register event subscriptions in `src/lib/events/registry.ts`
10. Run `pnpm db:generate` then `pnpm db:migrate`

## State Machine with Convenience Methods

The LabelTask aggregate root has a 6-state machine with 10 valid transitions. Key pattern: expose convenience methods that combine mutation + transition.

```typescript
// Convenience methods combine field updates with transitions
assign(annotatorId: UUID): void {
  if (this._state !== "pending" && this._state !== "review") {
    throw new TaskNotAssignableError(this.id, this._state);
  }
  this._assignedTo = annotatorId;
  this.transitionTo("in_progress");
}

finalize(finalLabelId: UUID, adjudicationRecord?: AdjudicationRecord): void {
  this._finalLabelId = finalLabelId;
  if (adjudicationRecord) {
    this._adjudicationRecord = adjudicationRecord;
  }
  this.transitionTo("finalized");
}

cancel(reason?: string): void {
  // Custom validation — cancel is allowed from 4 states
  const cancellableStates = ["pending", "in_progress", "review", "adjudication"];
  if (!cancellableStates.includes(this._state)) {
    throw new InvalidStateTransitionError("LabelTask", this._state, "cancelled");
  }
  this._state = "cancelled";
  this._updatedAt = new Date();
  this.addDomainEvent("label_task.cancelled", { ... });
}
```

**Key insight:** `cancel()` bypasses `transitionTo()` because it emits a different event type than the generic `state_changed` event. `finalize()` uses `transitionTo()` because it wants the standard transition validation.

## Label Versioning with is_current Flag

Labels are append-only. When an annotator re-submits, the previous label is marked `is_current = false` and a new one is inserted with an incremented version.

**CRITICAL: Order matters.**

```typescript
// 1. FIRST: mark previous versions not current
await this.labelRepo.markPreviousVersionsNotCurrent(taskId, annotatorId);

// 2. THEN: read current labels (previous are now excluded)
const existingLabels = await this.labelRepo.getCurrentByTaskId(taskId);

// 3. Calculate version from ALL labels (not just current)
const previousFromAnnotator = existingLabels.filter(
  (l) => l.annotatorId === annotatorId
);
const version = previousFromAnnotator.length > 0
  ? Math.max(...previousFromAnnotator.map((l) => l.version)) + 1
  : 1;
```

If you calculate the version BEFORE marking previous as not-current, you get stale data.

## Agreement Calculation as Pure Domain Functions

Agreement metrics live in `src/contexts/labeling/domain/agreement.ts` as pure functions — no I/O, no side effects, easy to test.

| Label Type | Metric | Threshold |
|---|---|---|
| `discrete` | Exact match (0 or 1) | 1.0 |
| `extractive` | Token-level F1 overlap | 0.7 |
| `generative` | Always requires adjudication | N/A |
| `rubric_scored` | 1 - normalized weighted MAD | 0.8 |
| `set_valued` | Jaccard index | 0.7 |

**Pattern:** `computeAgreement(labels, labelType)` returns a number. The caller compares against `AGREEMENT_THRESHOLDS[labelType]` to decide finalization vs adjudication.

## Auto-State-Transitions on Label Submission

After each label submission, the use case:

1. Transitions task from `in_progress` → `review`
2. Checks if `currentLabels.length >= task.labelsRequired` (default: 2)
3. If yes, runs `evaluateAgreement()` which auto-transitions to either `finalized` or `adjudication`

This means a single POST to `/api/v1/labels` can trigger up to 2 state transitions and 2 events.

## Event Emission on Both Finalization Paths

`label_task.finalized` must be emitted on BOTH paths to finalized:

1. **Direct finalization** (agreement OK after label submission) — emitted in `ManageLabels.evaluateAgreement()`
2. **Adjudication resolution** (manual PATCH to state endpoint) — emitted in `ManageLabelTasks.transition()`

The Candidate context's `onLabelTaskFinalized` handler expects `{ candidate_id }` in the payload and transitions the candidate to `labeled`.

## Cross-Context Adapters with Lazy Imports

```typescript
export class CandidateContextAdapter implements CandidateReader {
  async get(candidateId: UUID) {
    // Lazy import avoids circular dependency at module load time
    const { manageCandidates } = await import("@/contexts/candidate");
    try {
      const candidate = await manageCandidates.get(candidateId);
      return { id: candidate.id, state: candidate.state, scenario_type_id: candidate.scenarioTypeId as UUID };
    } catch (error) {
      if (error instanceof NotFoundError) return null;
      throw error;
    }
  }
}
```

**Rules:**
- Never static-import from another context's internals
- Always catch `NotFoundError` and return `null` (graceful degradation)
- Import from the context's composition root (`@/contexts/xxx`), not internal files

## Gotchas

| Issue | Wrong | Correct |
|---|---|---|
| Zod v4 nonnegative | `.nonneg()` | `.nonnegative()` |
| Zod v4 record | `z.record(z.unknown())` | `z.record(z.string(), z.unknown())` |
| Zod v4 import | `from "zod/v4"` | `from "zod"` |
| Label version calc | Calculate version then mark old not-current | Mark old not-current THEN calculate version |
| Route params (Next.js 16) | `params.id` | `const { id } = await params` |
| Dynamic label validation | Validate in Zod schema | Use `z.unknown()` then validate with `LABEL_VALUE_SCHEMAS[type]` after parse |

## Prevention Strategies

1. **Always run `pnpm build` before committing** — catches Zod API mismatches at TypeScript level
2. **Follow the bounded context checklist above** — prevents missing steps (forgotten barrel export, missing event registration)
3. **Test cross-context adapters against real context APIs** — adapter return shapes must match the port interface exactly
4. **Keep agreement thresholds as constants** — make them configurable per scenario type only in Phase 2

## Cross-References

- [Bounded Context DDD Implementation Patterns](./bounded-context-ddd-implementation-patterns.md) — directory structure, request flow, error mapping
- [Candidate Context DDD Implementation Patterns](./candidate-context-ddd-implementation-patterns.md) — class-based aggregates, state machines, cross-context integration
- [Next.js 16 Infrastructure Scaffolding Gotchas](./nextjs16-infrastructure-scaffolding-gotchas.md) — Zod v4, proxy.ts, postgres.js
