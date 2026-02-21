---
title: "feat: Wire dataset auto-refresh UI to suite detail page"
type: feat
status: completed
date: 2026-02-21
---

# Wire Dataset Auto-Refresh UI to Suite Detail Page

## Overview

The dataset auto-refresh backend is fully implemented (refresh policies, orchestrator, refresh runs) but the suite detail page has zero UI for it. Additionally, the domain model needs a correction: a dataset suite should be bound to **exactly one scenario type** (1 suite = 1 scenario cluster = N versions), not a loose bag of candidates.

## Problem Statement

1. **No UI for auto-refresh** — users cannot configure refresh policies, trigger runs, or see run history from the frontend.
2. **Missing domain constraint** — `DatasetSuite` has no `scenarioTypeId`. The scenario scoping is buried in the refresh policy's `scenarioTypeScope`/`scenarioTypeIds`, which is the wrong level. A candidate has no meaning without its scenario cluster, so the suite itself must be tied to a scenario type.

## Proposed Solution

### Domain correction

- Add `scenarioTypeId: UUID` (required) to `DatasetSuite`
- Remove `scenarioTypeScope` and `scenarioTypeIds` from `RefreshPolicy` — the orchestrator reads the scenario type from the suite directly
- Update suite creation UI to require selecting a scenario type
- Enforce uniqueness: one active suite per scenario type

### Frontend additions (on suite detail page)

1. **RefreshPolicySection** — view/configure the suite's auto-refresh policy
2. **"Trigger Refresh" button** — inline with the refresh policy header
3. **RefreshRunsSection** — paginated table of past refresh runs

### Backend fixes

- Persist failure reason on refresh runs
- Link refresh runs to created dataset versions

## Technical Approach

### Phase 1: Domain — Bind Suite to Scenario Type

#### 1a. Add `scenarioTypeId` to DatasetSuite

**Files:**

- `src/contexts/dataset/domain/entities/DatasetSuite.ts` — add `scenarioTypeId: UUID` to `DatasetSuiteData`
- `src/db/schema/dataset.ts` — add `scenarioTypeId` column (not null, uuid, FK to `sc_scenario_types`) + unique constraint on `scenarioTypeId`
- `src/contexts/dataset/infrastructure/DrizzleDatasetSuiteRepository.ts` — map the new column
- `src/contexts/dataset/application/use-cases/ManageDatasetSuites.ts` — require `scenarioTypeId` on create, validate it exists

**Migration:** New Drizzle migration adding the column.

#### 1b. Remove scenario scoping from RefreshPolicy

**Files:**

- `src/contexts/dataset/domain/value-objects/RefreshPolicy.ts` — remove `scenarioTypeScope` and `scenarioTypeIds` from `RefreshPolicyData`
- `src/contexts/dataset/application/services/AutoRefreshOrchestrator.ts` — read `suite.scenarioTypeId` instead of `policy.scenarioTypeScope`/`policy.scenarioTypeIds`. Always pass `[suite.scenarioTypeId]` to `candidateReader.findEligibleForDataset()`
- `app/api/v1/dataset-suites/[id]/refresh-policy/route.ts` — remove `scenarioTypeScope` and `scenarioTypeIds` from the Zod schema

#### 1c. Update suite creation API

**Files:**

- `app/api/v1/dataset-suites/route.ts` — add `scenario_type_id` (required uuid) to the create schema, pass to use case
- Validate the scenario type exists and no other suite already uses it

#### 1d. Update suite creation UI

**File:** `app/(dashboard)/datasets/page.tsx`

Add a `<Select>` in the create suite dialog to pick a scenario type. Fetch from `GET /scenario-types?page_size=100`. Show scenario type name + candidate count if available.

### Phase 2: Backend — Refresh Run Improvements

#### 2a. Persist failure reason on RefreshRun

**Problem:** `ManageRefreshRuns.trigger()` maps all non-`created` results to `"failed"` and discards the reason (`not_ready`, `draft_exists`, `cooldown`, `disabled`).

**Files:**

- `src/contexts/dataset/domain/entities/RefreshRun.ts` — add `failureReason: string | null` to `RefreshRunData`
- `src/db/schema/dataset.ts` — add `failureReason` column to `ds_refresh_runs` table
- `src/contexts/dataset/application/use-cases/ManageRefreshRuns.ts` — pass orchestrator result as `failureReason` when status is `failed`
- `src/contexts/dataset/infrastructure/DrizzleRefreshRunRepository.ts` — map the new column

#### 2b. Link RefreshRun to created DatasetVersion

**Files:**

- `src/contexts/dataset/application/services/AutoRefreshOrchestrator.ts` — change return type to `{ result: RefreshResult; datasetVersionId?: UUID }`
- `src/contexts/dataset/application/use-cases/ManageRefreshRuns.ts` — capture `datasetVersionId` from orchestrator, persist on run record

### Phase 3: Frontend — RefreshPolicySection

Follow the exact pattern of `GatePoliciesSection` (same file, ~lines 300-530).

#### Component: `RefreshPolicySection({ suiteId }: { suiteId: string })`

**Data fetching:**

```typescript
const {
  data: policy,
  isLoading,
  refetch,
} = useApi<RefreshPolicyData | null>(
  `/dataset-suites/${suiteId}/refresh-policy`
);
```

**States:**

- **No policy / null response** — show card with "Auto-refresh is not configured" + "Configure" button
- **Policy exists, disabled** — show policy summary with muted styling + "Enable" toggle + "Edit" button
- **Policy exists, enabled** — show policy summary with active styling + "Disable" toggle + "Edit" button

**Policy summary display (read-only card):**

| Field          | Display                                        |
| -------------- | ---------------------------------------------- |
| Status         | Badge: "Enabled" (green) or "Disabled" (muted) |
| Min Candidates | Number                                         |
| Cooldown       | `{n} minutes`                                  |
| Version Bump   | `auto` / `minor` / `patch`                     |
| Min Coverage   | `{n}%`                                         |
| Export Formats | Comma-separated badges or "None"               |

Note: no scenario type selector here — the scenario type is set at the suite level, not the policy level.

**Enable/disable toggle:** Inline `api.put()` call (same pattern as gate policy toggle at line 349-358), flipping only the `enabled` field while preserving all other values.

**Edit dialog:** Single `<Dialog>` with form fields:

| Field               | Component                                   | Validation       |
| ------------------- | ------------------------------------------- | ---------------- |
| Enabled             | Checkbox                                    | —                |
| Min Candidate Count | `<Input type="number">`                     | int, min 1       |
| Cooldown Minutes    | `<Input type="number">`                     | int, nonnegative |
| Version Bump Rule   | `<Select>` with options: auto, minor, patch | —                |
| Min Coverage %      | `<Input type="number">`                     | 0-100            |
| Export Formats      | Multi-checkbox: jsonl, cobalt, limestone    | —                |

**Delete:** `<ConfirmDialog>` calling `api.del()` on `/dataset-suites/${suiteId}/refresh-policy`.

**Mutations:**

```typescript
const { mutate: savePolicy, isPending } = useMutation(
  "PUT",
  `/dataset-suites/${suiteId}/refresh-policy`,
  {
    onSuccess: () => {
      toast.success("Refresh policy saved");
      closeDialog();
      refetch();
    },
    onError: (err) => toast.error(err.message),
  }
);
```

### Phase 4: Frontend — Trigger Refresh Button

Place a "Trigger Refresh" button in the RefreshPolicySection header row (next to the section title).

**Behavior:**

- **Disabled when:** no policy exists, or policy is disabled. Show tooltip explaining why.
- **On click:** POST to `/dataset-suites/${suiteId}/refresh-runs` with:
  ```json
  { "triggeredBy": "manual", "triggerEventId": "<uuidv7()>" }
  ```
- **On success (status = pending_diagnostics):** `toast.success("Refresh run started — new draft version created")`, refetch runs table.
- **On success (status = failed):** Show descriptive toast based on `failureReason`:
  - `not_ready` → "Not enough eligible candidates to create a version."
  - `draft_exists` → "A draft or validating version already exists."
  - `cooldown` → "Cooldown is active. Try again later."
  - `disabled` → "Auto-refresh is not enabled."
- **Loading state:** Button shows spinner while request is in-flight.

### Phase 5: Frontend — RefreshRunsSection

#### Component: `RefreshRunsSection({ suiteId }: { suiteId: string })`

**Data fetching:**

```typescript
const { data, isLoading, refetch } = useApi<PaginatedResponse<RefreshRunData>>(
  `/dataset-suites/${suiteId}/refresh-runs?page=${page}&page_size=10`
);
```

**Table columns:**

| Column         | Accessor           | Notes                                                        |
| -------------- | ------------------ | ------------------------------------------------------------ |
| Trigger        | `triggeredBy`      | Badge: "manual", "clustering_run", "scenario_graph_updated"  |
| Status         | `status`           | `<StateBadge>` — color-coded                                 |
| Failure Reason | `failureReason`    | Only shown when status=failed, human-readable                |
| Candidates     | `candidateCount`   | Number                                                       |
| Version        | `datasetVersionId` | Link to `/datasets/versions/{id}` if non-null, "—" otherwise |
| Started        | `startedAt`        | Relative time or date                                        |
| Completed      | `completedAt`      | Relative time, date, or "—"                                  |

**Empty state:** `<EmptyState icon={PlayIcon} title="No refresh runs" description="Trigger a manual refresh to create a dataset version from this scenario's candidates." />`

**Pagination:** Standard `<Pagination>` component below the table.

### Phase 6: Update Suite Detail Header

Show the linked scenario type name in the suite detail header (next to the suite name). Fetch scenario type name from `GET /scenario-types/{id}` or include it in the suite response.

## Acceptance Criteria

### Domain

- [x] `DatasetSuite` has required `scenarioTypeId` field
- [x] Unique constraint: one suite per scenario type
- [x] Suite creation requires selecting a scenario type
- [x] `RefreshPolicy` no longer has `scenarioTypeScope`/`scenarioTypeIds`
- [x] Orchestrator reads scenario type from suite, not policy

### Backend fixes

- [x] `failureReason` column added to `ds_refresh_runs` table via migration
- [x] Failed refresh runs persist the specific reason (`not_ready`, `draft_exists`, etc.)
- [x] Orchestrator returns `{ result, datasetVersionId? }` and `ManageRefreshRuns` persists both

### Frontend

- [x] Suite creation dialog has a scenario type selector
- [x] Suite detail header shows the linked scenario type name
- [x] `RefreshPolicySection` displays current policy or empty state
- [x] User can create/edit/delete a refresh policy via dialog form
- [x] User can toggle policy enabled/disabled inline
- [x] "Trigger Refresh" button is disabled with tooltip when no policy or policy disabled
- [x] Manual trigger shows appropriate success/failure toast
- [x] `RefreshRunsSection` lists past runs with status, trigger type, and candidate count
- [x] Failed runs display human-readable failure reason
- [x] Successful runs link to the created dataset version

## Dependencies & Risks

- **Scenario type endpoint:** Suite creation depends on `GET /scenario-types` existing for the selector. Verify this endpoint exists.
- **Cooldown stub:** `isCooldownActive()` always returns `false`. The cooldown field is shown in the form but not enforced. Acceptable for MVP — add tooltip "Cooldown enforcement coming soon."
- **Migration:** Two schema changes (suite `scenarioTypeId` + run `failureReason`) require Drizzle migrations.
- **Existing data:** If any dataset suites already exist in the DB without `scenarioTypeId`, the migration needs a strategy (nullable initially with backfill, or drop and recreate if dev-only).

## References

### Internal

- Suite detail page: `app/(dashboard)/datasets/[id]/page.tsx`
- GatePoliciesSection pattern: same file, lines ~300-530
- Refresh policy API: `app/api/v1/dataset-suites/[id]/refresh-policy/route.ts`
- Refresh runs API: `app/api/v1/dataset-suites/[id]/refresh-runs/route.ts`
- Orchestrator: `src/contexts/dataset/application/services/AutoRefreshOrchestrator.ts`
- ManageRefreshRuns: `src/contexts/dataset/application/use-cases/ManageRefreshRuns.ts`
- RefreshPolicy defaults: `src/contexts/dataset/domain/value-objects/RefreshPolicy.ts`
- RefreshRun entity: `src/contexts/dataset/domain/entities/RefreshRun.ts`
- DatasetSuite entity: `src/contexts/dataset/domain/entities/DatasetSuite.ts`

### Patterns

- CRUD section pattern: `docs/plans/2026-02-19-feat-frontend-dashboard-screens-plan.md`
- Dataset context patterns: `docs/solutions/integration-issues/dataset-context-versioned-suites-release-gates-patterns.md`
