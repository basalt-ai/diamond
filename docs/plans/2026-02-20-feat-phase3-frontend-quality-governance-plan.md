---
title: "Phase 3 Frontend — Quality & Governance Dashboard"
type: feat
status: completed
date: 2026-02-20
---

# Phase 3 Frontend — Quality & Governance Dashboard

## Overview

Build dashboard pages for Phase 3 Quality & Governance, integrating 9 existing API endpoints into the Next.js frontend. The work enhances the dataset version detail page with rich visualizations for diagnostics, drift, and gate results; adds gate policy management to the suite detail page; introduces an eval results page with failure analysis; and adds golden slice toggling.

All 9 backend API routes are already implemented and compiled. This plan is frontend-only.

## Problem Statement

The current dataset pages display raw JSON for gate results, lineage, and diagnostics (via `JsonViewer`). There is no UI for:

- Viewing diagnostics reports with agreement kappa, entropy, shortcut detection, leakage
- Configuring release gate policies per suite
- Viewing drift analysis between production and dataset distributions
- Browsing eval results and failure analysis across model versions
- Toggling golden slices on dataset versions

## Design Decisions

| Decision                                     | Rationale                                                                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Recharts** for all charts                  | Already in `package.json` (`recharts: 2.15.4`), used in scenario graph page with `ChartContainer` + `ChartConfig` pattern   |
| **Tabs on version detail**                   | 5+ new sections would create excessive scrolling. Use shadcn `Tabs` with: Overview, Quality, Drift, Lineage, Slices         |
| **Polling for 202 computing state**          | Add `pollInterval` option to `useApi` hook. Poll every 5s while status is 202, auto-stop on 200                             |
| **Gate policies as section on suite detail** | Policies are suite-scoped; a separate page is overkill for ≤20 rows                                                         |
| **Eval Results at `/datasets/eval-results`** | Nested under datasets in sidebar with sub-navigation                                                                        |
| **Failure analysis as separate route**       | `/datasets/eval-results/failure-analysis` with `?dataset_version_id=X` query param                                          |
| **Slices section on version detail**         | Add "Slices" tab showing slice list with golden toggle; requires slices data from version lineage or a new listing endpoint |

## Technical Approach

### Existing Patterns to Follow

Every page follows this exact pattern (established in `datasets/page.tsx`, `datasets/[id]/page.tsx`, `scenarios/graph/page.tsx`):

```
"use client"
→ interface definitions for API response types
→ column definitions for DataTable
→ page component using useApi() + useMutation()
→ space-y-6 wrapper → header → content cards
→ Dialog for create/edit forms
→ Skeleton for loading states
→ EmptyState for empty data
→ toast.success/error for feedback
```

**Components available**: `DataTable`, `KpiCard`, `StateBadge`, `JsonViewer`, `ConfirmDialog`, `EmptyState`, `ChartContainer` + recharts, all shadcn/ui primitives.

**Hooks**: `useApi<T>(path, { pollInterval? })` for GET, `useMutation(method, path, opts)` for mutations.

### Implementation Phases

---

## Phase 1: Infrastructure + Version Detail Tabs

**Duration:** ~3 days
**Goal:** Lay the foundation — polling support, tab structure, and two key visualizations.

### 1-1: Add polling support to `useApi` hook

**File:** `src/hooks/use-api.ts`

Add an optional `pollInterval` parameter (in ms). When set, the hook re-fetches on the interval. It should:

- Only poll when `data` indicates a transient state (caller controls this via a `shouldPoll` callback or by passing `null` to stop)
- Clear interval on unmount
- Stop polling when the response changes from 202 to 200

Also update `src/lib/api-client.ts` to expose HTTP status code alongside data, so `useApi` can detect 202 vs 200.

**Acceptance criteria:**

- [x] `useApi(path, { pollInterval: 5000 })` polls every 5s
- [x] Polling stops when component unmounts
- [x] API client returns `{ data, status }` shape

### 1-2: Refactor version detail page to use Tabs

**File:** `app/(dashboard)/datasets/versions/[id]/page.tsx`

Replace the current single-scrollable layout with shadcn `Tabs`:

```
Tabs:
  - Overview (existing: details card, selection policy, state transitions)
  - Quality (new: diagnostics report + gate results)
  - Drift (new: drift analysis chart)
  - Lineage (new: structured lineage view with pagination)
  - Slices (new: slice list with golden toggle)
```

Keep all existing functionality in the Overview tab. Other tabs are stubs initially.

**Acceptance criteria:**

- [x] 5 tabs rendered, Overview active by default
- [x] All existing functionality preserved in Overview tab
- [x] Tab state persisted in URL query param `?tab=quality`
- [x] Other tabs show "Coming soon" placeholder

### 1-3: Diagnostics report visualization (Quality tab)

**File:** `app/(dashboard)/datasets/versions/[id]/page.tsx` (Quality tab content)

**API:** `GET /api/v1/dataset-versions/[id]/diagnostics`

**States:**

- **No diagnostics** (version in draft): Show `EmptyState` — "Seal this version to compute diagnostics"
- **202 Computing**: Show pulsing card with "Computing diagnostics..." and poll every 5s
- **200 Report ready**: Show full visualization

**Visualization layout:**

```
KPI row (4 cards):
  - Overall Kappa (with Landis & Koch interpretation badge)
  - Redundancy Index
  - Coverage %
  - Entropy (normalized)

Agreement section:
  - Overall kappa KpiCard
  - Per-scenario kappa bar chart (horizontal bars, color-coded by Landis & Koch)
  - Low agreement slices table (from low_agreement_slices array)

Gate Results section:
  - Table: gate name | threshold | actual | passed (✓/✗) | blocking | scope | scope target
  - Color: green row if passed, red if failed+blocking, amber if failed+non-blocking

Optional sections (shown only if data exists):
  - Entropy: per-scenario entropy bar chart + high entropy count badge
  - Shortcuts: table of feature | NMI | risk level | significant
  - Leakage: leakage rate KpiCard + "X candidates leaked" badge
  - Coverage: uncovered scenarios list, min examples violations table
```

**Acceptance criteria:**

- [x] Diagnostics KPI row with 4 metrics
- [x] Per-scenario kappa bar chart using recharts `BarChart`
- [x] Gate results table with pass/fail/blocking indicators
- [x] 202 computing state with polling
- [x] Optional sections hidden when data is absent
- [x] `EmptyState` for draft versions

### 1-4: Gate results structured display

Inline within the Quality tab (1-3). Replace the existing `JsonViewer` for `gateResults` with a proper table.

Each `GateResult` row shows:

- Gate name
- Threshold
- Actual value
- Pass/fail badge (green/red)
- Blocking indicator (lock icon or "blocking" badge)
- Scope + scope target

**Acceptance criteria:**

- [x] Gate results table replaces JSON viewer
- [x] Color-coded pass/fail with blocking distinction
- [x] Backward compatible with old GateResult format (no blocking/scope fields)

---

## Phase 2: Drift + Lineage + Enhanced Diff

**Duration:** ~3 days

### 2-1: Drift analysis visualization (Drift tab)

**API:** `GET /api/v1/dataset-versions/[id]/drift?days=30`

**Layout:**

```
Header: "Drift Analysis" + days selector (7/14/30/60/90 dropdown)

KPI row:
  - JSD score (with severity badge: negligible/moderate/significant/severe)
  - Production candidates (count)
  - Dataset candidates (count)

Main chart: Grouped BarChart
  - X axis: scenario types
  - Two bars per scenario: production_pct (blue) vs dataset_pct (green)
  - Scenarios sorted by staleness_score descending

Stale scenarios table:
  - scenario_type_id | staleness_score | direction | recommendation
  - Rows color-coded by staleness severity
```

**Severity color map:**

- Negligible (JSD < 0.05): muted/gray
- Moderate (0.05-0.15): chart-4 (amber)
- Significant (0.15-0.3): chart-5 (orange)
- Severe (> 0.3): destructive (red)

**Edge cases:**

- No candidates in version: `EmptyState` — "This version has no candidates"
- No production data: info banner — "No production candidates in the last N days"

**Acceptance criteria:**

- [x] Days selector (dropdown: 7, 14, 30, 60, 90)
- [x] JSD KPI with severity badge
- [x] Grouped bar chart comparing distributions
- [x] Stale scenarios table with recommendations
- [x] Loading state with skeleton
- [x] Empty state for no-candidate versions

### 2-2: Lineage explorer (Lineage tab)

**API:** `GET /api/v1/dataset-versions/[id]/lineage?page=1&page_size=100`

Replace JSON viewer with structured view:

```
Header: scenario_graph_version, candidate_count, captured_at

Candidates table (paginated):
  - candidate_id (truncated + copy button)
  - episode_id (truncated)
  - scenario_type_id
  - label_task_ids (count badge)
  - rubric_version

Pagination: use existing Pagination component
```

Support `?candidate_id=X` drill-down via a search input above the table.

**Acceptance criteria:**

- [x] Structured table replacing JSON blob
- [x] Pagination with existing `Pagination` component
- [x] Candidate search/drill-down
- [x] Copy-to-clipboard for IDs

### 2-3: Enhanced diff page

**File:** `app/(dashboard)/datasets/diff/page.tsx`

Update the existing diff page to render the enhanced `VersionDiffData`:

```
Summary row:
  - Added (green badge): +N
  - Removed (red badge): -N
  - Changed (amber badge): ~N
  - Unchanged (muted): =N
  - Net delta: ±N

Scenario breakdown:
  - Table: scenario | added | removed | changed
  - Only show scenarios with changes

Candidate lists (collapsible):
  - Added candidate IDs (truncated, max 50 shown)
  - Removed candidate IDs (truncated, max 50 shown)
```

**Acceptance criteria:**

- [x] Summary badges for added/removed/changed/unchanged
- [x] Scenario breakdown table
- [x] Collapsible candidate ID lists
- [x] Backward compatible with old diff format (no `changed`, no `scenario_breakdown`)

---

## Phase 3: Gate Policies + Slices

**Duration:** ~2 days

### 3-1: Gate policies management (Suite detail page)

**File:** `app/(dashboard)/datasets/[id]/page.tsx`

Add a "Gate Policies" section below the versions table.

**API:** `POST/GET /api/v1/dataset-suites/[id]/release-gate-policies`

**Layout:**

```
Section header: "Release Gate Policies" + "Add Policy" button

Table columns:
  - Gate Name
  - Metric (agreement/redundancy/coverage/drift/entropy/leakage)
  - Comparison (≥ / ≤)
  - Threshold
  - Scope (overall/per_scenario/per_slice)
  - Blocking (lock icon or —)
  - Enabled (toggle switch)
  - Actions (edit/delete)

Empty state: "No gate policies configured. Add policies to control release quality."
```

**Create/Edit Dialog:**

```
Fields:
  - Gate Name (text input)
  - Metric (Select: agreement, redundancy, coverage, drift, entropy, leakage)
  - Threshold (number input)
  - Comparison (Select: ≥ gte, ≤ lte)
  - Scope (Select: overall, per_scenario, per_slice)
  - Slice Filter (conditional JSON input, shown only when scope=per_slice)
  - Blocking (checkbox, default checked)
  - Enabled (checkbox, default checked)
```

**Delete:** `ConfirmDialog` — "This will permanently remove this gate policy."

**Acceptance criteria:**

- [x] Gate policies table on suite detail page
- [x] Create dialog with metric/comparison/scope selectors
- [x] Edit dialog pre-populated with current values
- [x] Delete with confirmation
- [x] Enabled toggle inline (uses `PUT` to update)
- [x] Toast feedback for all mutations
- [x] Max 20 policy limit shown in UI

### 3-2: Slices with golden toggle (Slices tab on version detail)

**Data source:** Version's lineage or inline slices data. Note: slices are already on `ds_slices` table and associated with version, but no listing API exists in the spec. **Approach:** Add slice data to the version detail response, or fetch from `/dataset-versions/[id]/slices` if the endpoint exists.

If no slices endpoint: derive slices from version data or add a simple listing endpoint.

**API for toggle:** `PATCH /api/v1/dataset-versions/[id]/slices/[sliceId]/golden`

**Layout:**

```
Slices table:
  - Name
  - Candidate count
  - Golden (star icon, gold when active)
  - Stale candidates (count badge, shown only if > 0)
  - Created At

Golden toggle: Click star icon →
  - If marking golden: immediate mutation { golden: true }
  - If unmarking golden: ConfirmDialog "Unlock golden slice?" with force=true
```

**Acceptance criteria:**

- [x] Slices table on version detail Slices tab
- [x] Golden toggle with star icon
- [x] Unlock requires confirmation dialog
- [x] Stale candidate count shown when > 0
- [x] Toast feedback for toggle

---

## Phase 4: Eval Results + Failure Analysis

**Duration:** ~3 days

### 4-1: Eval Results listing page

**Route:** `app/(dashboard)/datasets/eval-results/page.tsx`

**API:** `GET /api/v1/eval-results`

**Layout:**

```
Header: "Eval Results" + optional "Ingest Results" button (links to docs/API)

Filters (inline above table):
  - Dataset Version ID (text input with UUID validation)
  - Model Name (text input)
  - Model Version (text input)

Table columns:
  - Model Name
  - Model Version
  - Dataset Version (truncated ID, linked to version detail)
  - Results Count
  - Pass Rate (with color: green >80%, amber 50-80%, red <50%)
  - External ID (truncated, if present)
  - Created At
  - Actions: "Failure Analysis" button (navigates with dataset_version_id)

Pagination: standard Pagination component
Empty state: "No eval results found. Ingest results from your CI pipeline."
```

**Acceptance criteria:**

- [x] Paginated eval runs table
- [x] Filters for version, model name, model version
- [x] Pass rate with color coding
- [x] Link to failure analysis per version
- [x] Empty state
- [x] Pagination

### 4-2: Failure analysis page

**Route:** `app/(dashboard)/datasets/eval-results/failure-analysis/page.tsx`

**API:** `GET /api/v1/eval-results/failure-analysis?dataset_version_id=X`

**Layout:**

```
Header: "Failure Analysis — Version {truncatedId}"

Summary KPI row:
  - Persistently Failing (red)
  - Newly Failing (orange)
  - Newly Fixed (green)
  - Regressing (amber)
  - Stable Passing (muted)

Model versions timeline: horizontal list of model version badges (chronological)

Scenario classifications table:
  - Scenario Type ID
  - Classification (color-coded badge)
  - Trend direction (arrow icon: ↑ improving, ↓ degrading, → stable, ~ fluctuating)
  - Trend slope
  - Pass rates sparkline (tiny inline chart showing rate per model version)

Pass rate matrix: heatmap or table
  - Rows: scenario types
  - Columns: model versions
  - Cells: pass rate with color (green >80%, red <50%, amber between)
```

**Edge cases:**

- `InsufficientEvalRunsError` (< 2 model versions): `EmptyState` — "Need at least 2 eval runs with different model versions for failure analysis"
- Version not found: 404 handling

**Acceptance criteria:**

- [x] Summary KPI row with 5 classification counts
- [x] Scenario classifications table with badges and trend arrows
- [x] Pass rate sparklines or heatmap
- [x] Insufficient eval runs empty state
- [x] Link back to eval results listing

### 4-3: Update sidebar navigation

**File:** `src/components/app-shell/sidebar.tsx`

Update the Datasets nav item to include sub-navigation:

```typescript
{
  title: "Datasets",
  href: "/datasets",
  icon: DatabaseIcon,
  children: [
    { title: "Suites", href: "/datasets" },
    { title: "Eval Results", href: "/datasets/eval-results" },
  ],
}
```

**Acceptance criteria:**

- [x] Datasets has expandable sub-navigation
- [x] "Suites" links to `/datasets`
- [x] "Eval Results" links to `/datasets/eval-results`
- [x] Active state highlights correctly

---

## Acceptance Criteria

### Functional Requirements

- [x] Version detail page has 5 tabs: Overview, Quality, Drift, Lineage, Slices
- [x] Diagnostics visualization with KPI cards, kappa bar chart, gate results table
- [x] 202 computing state with polling and progress indicator
- [x] Drift analysis with grouped bar chart and stale scenarios table
- [x] Lineage as paginated table with candidate search
- [x] Enhanced diff with summary badges and scenario breakdown
- [x] Gate policies CRUD on suite detail page
- [x] Golden slice toggle with confirmation for unlock
- [x] Eval results listing page with filters and pagination
- [x] Failure analysis with classification badges and trend indicators
- [x] Sidebar updated with Datasets sub-navigation

### Non-Functional Requirements

- [x] All pages follow existing `"use client"` + `useApi` + `useMutation` patterns
- [x] All charts use recharts wrapped in `ChartContainer` with `ChartConfig`
- [x] Loading states use `Skeleton` components
- [x] Empty states use `EmptyState` component
- [x] Error feedback via `toast.error()`
- [x] Responsive: 2-column grid at `md:` breakpoint, single column on mobile

### Quality Gates

- [x] `npx tsc --noEmit` passes with 0 errors
- [x] `pnpm lint` passes
- [x] All new types defined inline (no separate type files)
- [x] No new dependencies added (recharts + shadcn already available)

## Dependency Graph

```
Phase 1 (Foundation)
├── 1-1: Add polling to useApi ──────────┐
├── 1-2: Version detail tabs ────────────┤
├── 1-3: Diagnostics visualization ◄─────┤
└── 1-4: Gate results display ◄──────────┘

Phase 2 (Drift + Lineage)
├── 2-1: Drift analysis (uses 1-2 tabs)
├── 2-2: Lineage explorer (uses 1-2 tabs)
└── 2-3: Enhanced diff (independent)

Phase 3 (Policies + Slices)
├── 3-1: Gate policies CRUD (independent, on suite detail)
└── 3-2: Golden slice toggle (uses 1-2 tabs)

Phase 4 (Eval Results)
├── 4-1: Eval results listing (independent)
├── 4-2: Failure analysis ◄── 4-1
└── 4-3: Sidebar update (independent)
```

## References

### Internal References

- Dataset suite list page: `app/(dashboard)/datasets/page.tsx`
- Dataset suite detail: `app/(dashboard)/datasets/[id]/page.tsx`
- Version detail: `app/(dashboard)/datasets/versions/[id]/page.tsx`
- Diff page: `app/(dashboard)/datasets/diff/page.tsx`
- Scenario graph (chart reference): `app/(dashboard)/scenarios/graph/page.tsx`
- useApi hook: `src/hooks/use-api.ts`
- useMutation hook: `src/hooks/use-mutation.ts`
- API client: `src/lib/api-client.ts`
- DataTable: `src/components/data-table/data-table.tsx`
- KpiCard: `src/components/kpi-card.tsx`
- StateBadge: `src/components/state-badge.tsx`
- Sidebar: `src/components/app-shell/sidebar.tsx`
- Chart components: `src/components/ui/chart.tsx`

### API Endpoints (all implemented)

- `POST/GET /api/v1/dataset-suites/[id]/release-gate-policies`
- `GET/PUT/DELETE /api/v1/dataset-suites/[id]/release-gate-policies/[policyId]`
- `GET /api/v1/dataset-versions/[id]/diagnostics`
- `GET /api/v1/dataset-versions/[id]/drift?days=N`
- `GET /api/v1/dataset-versions/[id]/lineage`
- `POST/GET /api/v1/eval-results`
- `GET /api/v1/eval-results/failure-analysis?dataset_version_id=X`
- `PATCH /api/v1/dataset-versions/[id]/slices/[sliceId]/golden`
