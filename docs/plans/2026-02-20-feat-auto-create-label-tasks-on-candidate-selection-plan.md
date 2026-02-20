---
title: "feat: Auto-create label tasks when candidates reach selected state"
type: feat
status: completed
date: 2026-02-20
---

# Auto-create label tasks when candidates reach "selected" state

## Overview

The labeling task queue is always empty because label tasks are never auto-created. The PRD specifies that the Labeling context should consume selection events and auto-create label tasks, but no event handler exists. Currently there are 0 label tasks and 0 rubrics in the database despite having candidates at various states (1 selected, 1 labeled, 1 validated, 169 scored).

## Problem Statement

Two gaps prevent the labeling pipeline from working:

1. **No event handler** reacts to candidates reaching "selected" state to auto-create label tasks
2. **The `RubricReader` port** only supports lookup by rubric ID, not by scenario type ID — but auto-creation needs to resolve the rubric FROM the candidate's scenario type

Additionally, since 0 rubrics exist, we need a strategy for candidates selected before rubrics are created ("late rubric" problem).

## Proposed Solution

### 1. Add `getLatestForScenarioType()` to RubricReader port

**File:** `src/contexts/labeling/application/ports/RubricReader.ts`

Add method:

```typescript
getLatestForScenarioType(scenarioTypeId: UUID): Promise<{ id: UUID; version: number } | null>;
```

**File:** `src/contexts/labeling/infrastructure/ScenarioContextAdapter.ts`

Implement using `manageRubrics.getEffectiveRubrics(scenarioTypeId)` which walks up the scenario type tree (handles rubric inheritance). Return the first result's latest version, or `null` if none found.

### 2. Enrich `CandidateStateChangedPayload` with `scenario_type_id`

**File:** `src/contexts/candidate/domain/events.ts`

Add `scenario_type_id: string | null` to the payload to avoid an extra DB round-trip in the handler.

**File:** `src/contexts/candidate/application/use-cases/ManageCandidates.ts`

Include `scenario_type_id` when publishing the event.

### 3. Create `onCandidateSelected` handler

**File:** `src/contexts/labeling/application/handlers/onCandidateSelected.ts` (new)

```typescript
export async function onCandidateSelected(event: DomainEvent): Promise<void> {
  const { candidate_id, to_state, scenario_type_id } = event.payload;
  if (to_state !== "selected") return;
  if (!scenario_type_id) {
    console.warn("...");
    return;
  }

  // Resolve rubric for this scenario type
  const rubric = await rubricReader.getLatestForScenarioType(scenarioTypeId);
  if (!rubric) {
    console.warn("No rubric for scenario type, skipping");
    return;
  }

  try {
    await manageLabelTasks.create({ candidate_id, rubric_id: rubric.id });
  } catch (error) {
    if (error instanceof DuplicateError) return; // idempotent
    throw error;
  }
}
```

Key design decisions:

- **Skip (not throw) when no rubric exists** — the event bus is synchronous, throwing would fail the candidate state transition
- **Skip when `scenario_type_id` is null** — can't resolve rubric without it
- **Catch `DuplicateError` for idempotency** — unique constraint on `candidate_id` in `lb_label_tasks` already exists

### 4. Create `onRubricVersionCreated` handler (backfill)

**File:** `src/contexts/labeling/application/handlers/onRubricVersionCreated.ts` (new)

When a rubric is created, scan for candidates in "selected" state with matching `scenario_type_id` that don't yet have label tasks, and create them. This handles the "late rubric" ordering problem.

Requires adding to `CandidateReader` port:

```typescript
listByState(state: string, scenarioTypeId?: UUID): Promise<Array<{ id: UUID; scenario_type_id: UUID }>>;
```

### 5. Register handlers in event registry

**File:** `src/lib/events/registry.ts`

```typescript
import { onCandidateSelected } from "@/contexts/labeling/application/handlers/onCandidateSelected";
import { onRubricVersionCreated } from "@/contexts/labeling/application/handlers/onRubricVersionCreated";

eventBus.subscribe("candidate.state_changed", onCandidateSelected);
eventBus.subscribe("rubric.version_created", onRubricVersionCreated);
```

### 6. Fix `CandidateReader` port nullability

**File:** `src/contexts/labeling/application/ports/CandidateReader.ts`

Change `scenario_type_id: UUID` to `scenario_type_id: UUID | null` to match reality.

**File:** `src/contexts/labeling/infrastructure/CandidateContextAdapter.ts`

Remove the unsafe `as UUID` cast.

## Acceptance Criteria

- [x] When a candidate transitions to "selected" and a rubric exists for its scenario type, a label task is auto-created in "pending" state
- [x] When no rubric exists for the scenario type, the candidate transition succeeds but no label task is created (warning logged)
- [x] When a rubric is later created for a scenario type, label tasks are backfilled for any "selected" candidates without tasks
- [x] Duplicate label task creation is handled idempotently (no error, no duplicate)
- [x] Candidates with null `scenario_type_id` are skipped gracefully
- [x] `GET /api/v1/label-tasks` returns auto-created tasks
- [x] Manual `POST /api/v1/label-tasks` still works as before

## Files to Modify

| File                                                                   | Change                                     |
| ---------------------------------------------------------------------- | ------------------------------------------ |
| `src/contexts/labeling/application/ports/RubricReader.ts`              | Add `getLatestForScenarioType()`           |
| `src/contexts/labeling/application/ports/CandidateReader.ts`           | Fix nullability, add `listByState()`       |
| `src/contexts/labeling/infrastructure/ScenarioContextAdapter.ts`       | Implement `getLatestForScenarioType()`     |
| `src/contexts/labeling/infrastructure/CandidateContextAdapter.ts`      | Implement `listByState()`, fix nullability |
| `src/contexts/labeling/application/handlers/onCandidateSelected.ts`    | New handler                                |
| `src/contexts/labeling/application/handlers/onRubricVersionCreated.ts` | New handler (backfill)                     |
| `src/contexts/candidate/domain/events.ts`                              | Enrich payload with `scenario_type_id`     |
| `src/contexts/candidate/application/use-cases/ManageCandidates.ts`     | Include `scenario_type_id` in event        |
| `src/lib/events/registry.ts`                                           | Register both new handlers                 |

## Verification

1. Create a rubric for an existing scenario type: `POST /api/v1/rubrics`
2. Verify backfill: check if the already-selected candidate gets a label task
3. Transition another candidate to "selected": `PATCH /api/v1/candidates/:id/state`
4. Verify auto-creation: `GET /api/v1/label-tasks` should show tasks
5. Verify idempotency: re-transitioning should not create duplicates
6. Verify skip on missing rubric: select a candidate with a scenario type that has no rubric
