---
title: "Phase 3 — Quality & Governance"
type: feat
status: active
date: 2026-02-20
deepened: 2026-02-20
milestone: "Phase 3 — Quality & Governance"
linear_milestone_id: 08b56b4b-adde-43ad-ab05-4eee21316dc8
epics:
  - GET-83 (Advanced Diagnostics)
  - GET-93 (Drift Detection)
  - GET-107 (Version Diffs & Lineage)
  - GET-120 (Advanced Release Gates)
  - GET-125 (Eval Result Ingestion & Failure Loop)
issues: 22
---

# Phase 3 — Quality & Governance

## Enhancement Summary

**Deepened on:** 2026-02-20
**Sections enhanced:** All 4 waves + architecture + schema
**Research agents used:** architecture-strategist, performance-oracle, security-sentinel, data-integrity-guardian, pattern-recognition-specialist, best-practices-researcher (statistical algorithms)

### Key Improvements from Review

1. **Extract `MetricComputer` strategy objects** from `RunDiagnostics` before Wave 1 — the use case would grow to 7+ computation concerns otherwise (God Object)
2. **Add `ds_dataset_version_candidates` join table** — the JSONB `candidate_ids` array cannot support index-based set operations needed by leakage checks, diffs, and eval validation at 10K+ candidates
3. **Consolidate `ds_diagnostics_reports`** to a single `metrics JSONB` column instead of 9 separate JSONB columns
4. **Cap per-candidate arrays** in diagnostics reports (max 200 high-entropy candidates, max 1000 leakage entries) to prevent multi-MB rows
5. **Move `RunDiagnostics` to background job** — synchronous computation of 7 metrics on 10K candidates will timeout the Next.js request handler
6. **Fix naming inconsistencies** — `eval_results.ingested` → `eval_run.ingested`, `IngestEvalResults` → `ManageEvalRuns`, `EvalResult` → value object (not entity)
7. **Nest gate policies under suites** — `/api/v1/dataset-suites/[id]/release-gate-policies` instead of flat `/release-gates`
8. **Pure TypeScript statistical implementations** — Cohen's/Fleiss' kappa, Shannon entropy, mutual information, Jensen-Shannon divergence, chi-squared test with all edge cases handled
9. **Add missing domain errors** — 8 new typed errors needed for Phase 3 operations
10. **Add FK constraints** to all new tables + retroactively to existing `ds_` tables

### Critical Prerequisites (Before Wave 1)

| Task | Why |
|---|---|
| Replace O(n^2) `computeRedundancy` loop with SQL GROUP BY | Current code does 50M iterations at 10K candidates — breaks 30s SLO alone |
| Add `ds_dataset_version_candidates` join table | JSONB array prevents indexed set ops for leakage, diff, eval validation |
| Extract `MetricComputer` strategy objects from `RunDiagnostics` | Use case at 257 lines would grow to 800+ without decomposition |
| Fix N+1 in `CandidateContextAdapter.getMany()` | Current for-loop calls `manageCandidates.get(id)` per candidate — 10K sequential calls |
| Add FK constraints to existing `ds_` tables | Missing `.references()` on all existing `*_id` columns |

---

## Overview

Make dataset releases trustworthy. Phase 3 extends Diamond's Dataset context with advanced diagnostics (agreement by slice, entropy, shortcut detection, leakage), drift detection between production and dataset distributions, enhanced version diffs with full lineage exploration, configurable release gate policies, and eval result ingestion enabling a failure loop that answers: "How did dataset changes alter model decisions over time?"

**Depends on:** Phase 2 — Intelligence (scoring engine, embeddings, feature extraction provide the data substrate for meaningful diagnostics and drift detection).

## Problem Statement

Phase 1 established basic diagnostics (redundancy via Jaccard, agreement via label pairs) and hardcoded release gates (`min_agreement: 0.6`, `max_redundancy: 0.1`). This is insufficient for production governance:

1. **No slice-level visibility** — global agreement hides per-scenario quality variation
2. **No drift detection** — datasets silently become stale as production traffic shifts
3. **No eval feedback loop** — Diamond exports datasets but never learns from eval results
4. **Primitive diffs** — only candidate set addition/removal, no semantic understanding of what changed
5. **No lineage exploration** — provenance is stored as JSONB but not queryable via API
6. **No configurable gates** — hardcoded thresholds, no per-suite or per-slice customization
7. **No golden slices** — no locked regression baselines across dataset versions

## Design Decisions & Assumptions

The SpecFlow analysis surfaced several ambiguities in the PRD. The following decisions are made for this plan (flagged for review):

| Decision | Rationale |
|---|---|
| **Eval results live in the Dataset context** (not Export) | API paths, data model, and consumption patterns all point to Dataset. EvalRun's lifecycle questions are Dataset questions ("did this version produce good signal?"). Placing it in Export would create dependency inversion. Provisionally in Dataset — re-evaluate extraction to separate `Evaluation` context after Phase 3 if `AnalyzeFailures` needs circular reads with diagnostics. |
| **Shortcut detection = mutual information between Phase 2 features and majority label** | Feature-label correlation via MI, flagging features with NMI > 0.1 (medium) or > 0.3 (high). Significance via G-test with Bonferroni correction. Requires Phase 2 feature data. |
| **Leakage check = candidate overlap by episode_id across released versions in same suite** | Near-duplicate detection across dataset boundaries. Extended in future to embedding-space similarity. |
| **KL/JS divergence computed on scenario type frequency distributions** | Production candidate scenario proportions vs dataset version scenario proportions. Works without embeddings at Phase 3 launch; embedding-space density deferred. |
| **"Changed" candidate in enhanced diff = same candidate ID with different finalized label content hash** | Label hash stored at finalization time on `lb_label_tasks` for efficient SQL comparison. |
| **Per-slice gate failure is configurable: blocking or warning** | Each gate policy has a `blocking` boolean. Non-blocking failures appear in diagnostics but don't prevent release. |
| **Golden slices auto-carry forward** | When creating a new version, golden slices from the latest released version in the same suite are automatically included. Stale candidates tracked in `stale_candidate_ids` JSONB array. |
| **`GET /diagnostics` returns cached report; computation runs as background job** | State transition to `validating` enqueues diagnostics job. API returns `{ status: "computing" }` until report is ready, then full report. |
| **Release gate policies are scoped to a suite** | Each policy belongs to a suite. Nested under `/dataset-suites/[id]/release-gate-policies`. |
| **Drift time window defaults to 30 days**, configurable via query param | `?days=N` on the drift API endpoint. |
| **"Production candidate" for drift = candidates in `raw` or later state, filtered by `created_at`** | Uses creation timestamp, not state-specific transition dates. |

## Technical Approach

### Architecture

All Phase 3 work stays within the Dataset bounded context. No new contexts are created.

**Decomposition of `RunDiagnostics`:**

The existing `RunDiagnostics` use case (257 lines) must be decomposed before adding 6 new metric categories. Extract computation into domain services following the Intelligence context's `CompositeScoringEngine` pattern:

```
src/contexts/dataset/domain/services/
├── AgreementComputer.ts        # Cohen's + Fleiss' kappa, per-slice
├── EntropyComputer.ts          # Shannon entropy per candidate/scenario
├── ShortcutDetector.ts         # Mutual information, chi-squared
├── LeakageChecker.ts           # episode_id overlap across versions
├── CoverageAnalyzer.ts         # scenario coverage computation
├── GateEvaluator.ts            # configurable gate policy evaluation
└── StatisticalUtils.ts         # shared: kappa, entropy, MI, JSD, chi-squared
```

`RunDiagnostics.execute()` becomes a thin orchestrator: fetch data, call each service, collect results into `DiagnosticsReport`, persist, evaluate gates, transition state, emit events.

**Dataset context extensions:**
- New domain entity: `ReleaseGatePolicy`
- New aggregate root: `EvalRun` (with `EvalResultData` as value object, not entity)
- Extended value objects: `DiagnosticsReport`, `VersionDiff`
- New use cases: `ManageReleaseGatePolicies`, `ManageEvalRuns` (replaces `IngestEvalResults`), `RunFailureAnalysis` (replaces `AnalyzeFailures`), `ComputeDrift` (replaces `DetectDrift`), `ManageGoldenSlices`
- Extended use cases: `RunDiagnostics` (orchestrator only), `ComputeVersionDiff` (enhanced diff)
- New ports: `ProductionDistributionReader`, `CandidateFeatureReader` (separate from `CandidateReader`)
- New infrastructure: `DrizzleReleaseGatePolicyRepository`, `DrizzleEvalRunRepository`, `CandidateDistributionAdapter` (separate from existing `CandidateContextAdapter`)

**New database tables:**
- `ds_dataset_version_candidates` — join table replacing JSONB `candidate_ids` for set operations
- `ds_release_gate_policies` — configurable gate definitions
- `ds_eval_runs` — eval run metadata (model version, CI info)
- `ds_eval_results` — per-candidate eval outcomes
- `ds_diagnostics_anomalies` — per-candidate anomaly records (high entropy, shortcuts, leakage)

**Schema changes to existing tables:**
- `ds_slices`: add `is_golden` boolean + `locked_at` timestamp + `stale_candidate_ids` JSONB
- `ds_diagnostics_reports`: consolidate to single `metrics` JSONB column (replaces 2 existing + avoids 7 new columns)
- `lb_label_tasks`: add `label_hash` VARCHAR(32) — content hash stored at finalization

**New domain events:**
- `eval_run.ingested` — when CI posts results (singular noun per convention)
- `golden_slice.locked` — when a slice is marked golden
- `drift.detected` — when drift exceeds threshold (enables notification handlers)
- `release_gate_policy.created` / `release_gate_policy.deleted` — for audit trail

**New domain errors** (`src/contexts/dataset/domain/errors.ts`):
- `ReleaseGatePolicyNotFoundError extends NotFoundError`
- `DuplicateGatePolicyError extends DuplicateError`
- `EvalRunNotFoundError extends NotFoundError`
- `DuplicateEvalRunError extends DuplicateError`
- `DatasetVersionNotReleasedError extends DomainError`
- `InsufficientEvalRunsError extends DomainError`
- `GoldenSliceImmutableError extends DomainError`
- `EmptyDatasetVersionError extends DomainError`

**New API routes (9 endpoints):**
- `POST/GET /api/v1/dataset-suites/[id]/release-gate-policies` — gate policy CRUD (nested under suite)
- `GET/PUT/DELETE /api/v1/dataset-suites/[id]/release-gate-policies/[policyId]` — single policy operations
- `GET /api/v1/dataset-versions/[id]/diagnostics` — full diagnostics report
- `GET /api/v1/dataset-versions/[id]/drift` — drift analysis
- `GET /api/v1/dataset-versions/[id]/lineage` — lineage graph
- `POST /api/v1/eval-results` — ingest eval results
- `GET /api/v1/eval-results` — list/filter eval results
- `GET /api/v1/eval-results/failure-analysis` — failure loop analysis (noun, not verb)

### ERD — New & Modified Tables

```mermaid
erDiagram
    ds_dataset_suites ||--o{ ds_release_gate_policies : "has policies"
    ds_dataset_versions ||--o{ ds_dataset_version_candidates : "contains"
    ds_dataset_versions ||--o{ ds_diagnostics_reports : "has report"
    ds_dataset_versions ||--o{ ds_slices : "has slices"
    ds_dataset_versions ||--o{ ds_eval_runs : "evaluated by"
    ds_eval_runs ||--o{ ds_eval_results : "contains"
    ds_diagnostics_reports ||--o{ ds_diagnostics_anomalies : "details"

    ds_dataset_version_candidates {
        uuid dataset_version_id PK_FK
        uuid candidate_id PK
    }

    ds_release_gate_policies {
        uuid id PK
        uuid suite_id FK "onDelete restrict"
        varchar gate_name "unique with suite_id"
        varchar metric "CHECK: agreement|redundancy|coverage|drift|entropy"
        float threshold
        varchar comparison "CHECK: gte|lte"
        varchar scope "CHECK: overall|per_scenario|per_slice"
        jsonb slice_filter "nullable, validated schema"
        boolean blocking "default true"
        boolean enabled "default true"
        timestamp created_at
        timestamp updated_at
    }

    ds_eval_runs {
        uuid id PK
        uuid dataset_version_id FK "onDelete restrict"
        varchar model_name
        varchar model_version
        varchar eval_run_external_id "nullable, partial unique"
        jsonb metadata "validated schema, max 64KB"
        timestamp created_at
    }

    ds_eval_results {
        uuid id PK
        uuid eval_run_id FK "onDelete cascade"
        uuid candidate_id "cross-context, no FK"
        boolean passed
        float score "nullable"
        jsonb judge_output "nullable, max 16KB"
        varchar failure_mode "nullable"
    }

    ds_diagnostics_reports {
        uuid id PK
        uuid dataset_version_id FK "unique"
        jsonb metrics "single column, typed at app layer"
        jsonb gate_results
        jsonb summary
        timestamp created_at
    }

    ds_diagnostics_anomalies {
        uuid id PK
        uuid diagnostics_report_id FK "onDelete cascade"
        varchar metric_type "high_entropy|shortcut|leakage"
        uuid candidate_id
        varchar severity
        jsonb payload
    }

    ds_slices {
        uuid id PK
        uuid dataset_version_id FK
        varchar name
        jsonb filter
        jsonb candidate_ids
        boolean is_golden "NEW default false"
        timestamp locked_at "NEW nullable"
        jsonb stale_candidate_ids "NEW nullable"
    }
```

### Implementation Phases

Phase 3 is organized into 4 implementation waves based on dependency ordering. **Wave 0 (prerequisites)** must be completed before any Phase 3 work begins.

---

## Wave 0: Prerequisites

**Duration:** ~1 week
**Purpose:** Fix structural issues that would block Phase 3 performance targets.

### P-1: Replace O(n^2) computeRedundancy with SQL

**File:** `src/contexts/dataset/application/use-cases/RunDiagnostics.ts` (lines 175-196)

The current nested-loop Jaccard comparison executes ~50M iterations at 10K candidates. Replace with:

```sql
-- Exact duplicates by episode_id
SELECT cd.episode_id, array_agg(cd.id) AS candidate_ids
FROM ds_dataset_version_candidates dvc
JOIN cd_candidates cd ON cd.id = dvc.candidate_id
WHERE dvc.dataset_version_id = $1
GROUP BY cd.episode_id
HAVING COUNT(*) > 1;
```

### P-2: Add ds_dataset_version_candidates join table

Replace JSONB `candidate_ids` for set operations. Migration maintains backward compatibility by keeping the JSONB column during transition.

```sql
CREATE TABLE ds_dataset_version_candidates (
  dataset_version_id UUID NOT NULL REFERENCES ds_dataset_versions(id) ON DELETE CASCADE,
  candidate_id       UUID NOT NULL,
  PRIMARY KEY (dataset_version_id, candidate_id)
);
CREATE INDEX ds_dvc_candidate_id_idx ON ds_dataset_version_candidates(candidate_id);

-- Backfill from JSONB
INSERT INTO ds_dataset_version_candidates (dataset_version_id, candidate_id)
SELECT dv.id, elem::uuid
FROM ds_dataset_versions dv,
     jsonb_array_elements_text(dv.candidate_ids) elem;
```

### P-3: Extract MetricComputer strategy objects

Create `src/contexts/dataset/domain/services/` directory. Move existing `computeRedundancy` and `computeAgreement` private methods into `RedundancyComputer.ts` and `AgreementComputer.ts`. `RunDiagnostics` orchestrates.

### P-4: Fix CandidateContextAdapter N+1

Replace the per-ID for-loop with a batch query. The adapter should use a direct DB query for `getMany(ids)` rather than calling `manageCandidates.get(id)` in a loop.

### P-5: Add FK constraints to existing ds_ tables

Add `.references()` to `ds_slices.datasetVersionId`, `ds_diagnostics_reports.datasetVersionId`, `ds_dataset_versions.suiteId`. Use `onDelete: "restrict"` for parent references.

### P-6: Add DiagnosticsReportRepository port

Extract `this.db.insert(dsDiagnosticsReports)` from `RunDiagnostics` into a proper repository port, enabling unit testing without a real database.

### P-7: Extend GateResult interface

Add `blocking: boolean`, `scope: string`, and `scopeTarget: string | null` to `GateResult` before gate policy evaluation is wired.

---

## Wave 1: Foundation — Gate Policies + Enhanced Diagnostics

**Duration:** ~2 weeks
**Dependencies:** Wave 0 complete, Phase 2 complete
**Issues:** GET-122, GET-86, GET-87, GET-88, GET-89, GET-91

### GET-122: Configurable Gate Policies API

**Context:** Dataset
**Files to create/modify:**

```
src/db/schema/dataset.ts                                    # Add ds_release_gate_policies table
src/contexts/dataset/domain/entities/ReleaseGatePolicy.ts   # New entity
src/contexts/dataset/domain/errors.ts                       # Add gate policy errors
src/contexts/dataset/application/ports/ReleaseGatePolicyRepository.ts  # Port
src/contexts/dataset/application/use-cases/ManageReleaseGatePolicies.ts # CRUD use case
src/contexts/dataset/infrastructure/DrizzleReleaseGatePolicyRepository.ts # Adapter
src/contexts/dataset/index.ts                               # Wire new use case
app/api/v1/dataset-suites/[id]/release-gate-policies/route.ts      # POST + GET (list)
app/api/v1/dataset-suites/[id]/release-gate-policies/[policyId]/route.ts  # GET + PUT + DELETE
```

**Schema:**

```typescript
export const dsReleaseGatePolicies = pgTable(
  "ds_release_gate_policies",
  {
    id: uuid("id").primaryKey(),
    suiteId: uuid("suite_id").notNull().references(() => dsDatasetSuites.id, { onDelete: "restrict" }),
    gateName: varchar("gate_name", { length: 100 }).notNull(),
    metric: varchar("metric", { length: 50 }).notNull(),
    threshold: doublePrecision("threshold").notNull(),
    comparison: varchar("comparison", { length: 10 }).notNull(),
    scope: varchar("scope", { length: 20 }).notNull().default("overall"),
    sliceFilter: jsonb("slice_filter"),
    blocking: boolean("blocking").notNull().default(true),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("ds_release_gate_policies_suite_name_uniq").on(t.suiteId, t.gateName),
    index("ds_release_gate_policies_suite_enabled_idx").on(t.suiteId, t.enabled),
  ],
);
```

**Slice filter validation (Zod schema at API boundary):**

```typescript
const SliceFilterSchema = z.object({
  sliceNames: z.array(z.string()).optional(),
  scenarioTypeIds: z.array(z.string().uuid()).optional(),
}).strict();
```

**CHECK constraints** (in migration SQL):

```sql
ALTER TABLE ds_release_gate_policies
  ADD CONSTRAINT ds_rgp_metric_check CHECK (metric IN ('agreement', 'redundancy', 'coverage', 'drift', 'entropy', 'leakage')),
  ADD CONSTRAINT ds_rgp_comparison_check CHECK (comparison IN ('gte', 'lte')),
  ADD CONSTRAINT ds_rgp_scope_check CHECK (scope IN ('overall', 'per_scenario', 'per_slice'));
```

**Acceptance criteria:**
- [ ] CRUD API for release gate policies nested under `/dataset-suites/[id]/release-gate-policies`
- [ ] Validation: metric, comparison, scope via CHECK constraints + Zod
- [ ] Unique constraint on `(suite_id, gate_name)`
- [ ] Policies can be enabled/disabled without deletion
- [ ] Blocking vs non-blocking flag per policy
- [ ] `sliceFilter` validated against strict Zod schema
- [ ] Max 20 policies per suite (application-level limit)
- [ ] Emit `release_gate_policy.created` / `release_gate_policy.deleted` events
- [ ] Deprecate `selectionPolicy` gate override fields on dataset versions

### GET-86: Inter-Annotator Agreement by Slice

**Context:** Dataset (domain service: `AgreementComputer`)
**Files to create/modify:**

```
src/contexts/dataset/domain/services/AgreementComputer.ts        # Pure computation
src/contexts/dataset/domain/services/StatisticalUtils.ts         # cohensKappa(), fleissKappa()
src/contexts/dataset/domain/value-objects/DiagnosticsReport.ts   # Extend AgreementReport
src/contexts/dataset/application/ports/LabelReader.ts            # Extend with enriched labels
```

**Statistical implementation details:**

Cohen's kappa (2 raters):
```
κ = (p_o - p_e) / (1 - p_e)
p_o = diagonal sum / N (observed agreement)
p_e = Σ(row_marginal * col_marginal) / N² (expected by chance)
```

Fleiss' kappa (3+ raters, supports variable n_i per item):
```
P_i = (1/(n_i*(n_i-1))) * Σ_j [n_ij * (n_ij - 1)]
P_bar = (1/N) * Σ P_i
P_e = Σ p_j²
κ = (P_bar - P_e) / (1 - P_e)
```

**Edge cases (from institutional learnings + research):**
- All same category: `p_e → 1`, denominator → 0. Guard with epsilon check, return kappa `1.0` if perfect agreement, `0` otherwise, with warning.
- 0 labels: return kappa `1.0` (not NaN) — per labeling context convention.
- Single annotator: return `null` (cannot compute pairwise agreement).
- Small N (< 30): add warning about statistical unreliability.
- Variable rater counts: use per-item `n_i` denominators (approximation of Fleiss). Consider Krippendorff's alpha for very sparse data.
- Negative kappa: valid — means agreement below chance. Flag as anomaly.

**Interpretation thresholds (Landis & Koch):**

| kappa | Interpretation | Flag? |
|---|---|---|
| < 0 | Below chance | Critical |
| 0.01-0.20 | Slight | High |
| 0.21-0.40 | Fair | Medium |
| 0.41-0.60 | Moderate | Low |
| 0.61-0.80 | Substantial | OK |
| 0.81-1.00 | Almost perfect | OK |

**Extended `AgreementReport` shape:**

```typescript
interface AgreementReport {
  overallKappa: number;
  perScenarioKappa: Record<string, number>;
  perFailureModeKappa: Record<string, number>;
  perRiskTierKappa: Record<string, number>;
  perSliceKappa: Record<string, number>;
  lowAgreementSlices: Array<{
    sliceName: string;
    kappa: number;
    sampleSize: number;
  }>;
  sampleSize: number;
  method: "cohen" | "fleiss";
}
```

**LabelReader enrichment** (single query, no N+1):

```typescript
interface LabelSummaryEnriched {
  labelTaskId: UUID;
  labelValue: unknown;
  annotatorId: string;
  scenarioTypeId: UUID | null;
  failureMode: string | null;
  riskTier: string | null;
}
```

**Acceptance criteria:**
- [ ] Cohen's kappa for 2-annotator tasks, Fleiss' kappa for 3+
- [ ] Breakdown by scenario type, failure mode, risk tier, and named slices
- [ ] Flag slices with agreement >1 std dev below mean
- [ ] Handle all edge cases: 0 labels → `1.0`, 1 annotator → `null`, small N → warning
- [ ] All kappa computation in pure functions with NO I/O (per labeling context pattern)
- [ ] Single DB query for all labels with grouping metadata

### GET-87: Label Entropy Analysis

**Context:** Dataset (domain service: `EntropyComputer`)

**Formula:**
```
H(X) = -Σ p_i * log₂(p_i)     [raw, in bits]
H_norm = H(X) / log₂(k)        [normalized, [0,1]]
```
Convention: `0 * log(0) = 0`.

**Always use normalized entropy** for cross-dataset comparisons.

**Flag thresholds:**
- `H_norm < 0.3` → severe class imbalance (high severity)
- `H_norm < 0.5` → class imbalance (medium severity)
- Per-candidate `H_norm > 0.8` → high disagreement among annotators

**Acceptance criteria:**
- [ ] Shannon entropy computed per scenario and per slice
- [ ] High-entropy candidates flagged (normalized entropy > 0.8)
- [ ] **Cap `highEntropyCandidates` at 200** (store top N by entropy, not all)
- [ ] Store anomalies in `ds_diagnostics_anomalies` table, not inline JSONB
- [ ] Store summary metrics in `ds_diagnostics_reports.metrics`

### GET-88: Shortcut Detection

**Context:** Dataset (domain service: `ShortcutDetector`)

**Algorithm — Mutual Information + significance testing:**

```
I(X;Y) = Σ_x Σ_y p(x,y) * log[p(x,y) / (p(x) * p(y))]
NMI = I(X;Y) / sqrt(H(X) * H(Y))   [geometric mean normalization]
G = 2 * N * I(X;Y)                   [G-test statistic, ~χ²((|X|-1)(|Y|-1))]
```

- For categorical features: exact discrete MI
- For continuous features: discretize via equal-frequency bins
- Significance: G-test with **Bonferroni correction** (`alpha = 0.05 / numFeatures`)
- Small-sample bias: apply **Miller-Madow correction** when N < 50: `I_corrected = I - (|X||Y| - 1) / (2N)`

**Flag thresholds:**
- `NMI > 0.1` → medium risk (potential shortcut)
- `NMI > 0.3` → high risk (strong shortcut indicator)

**New port** (separate from `CandidateReader` to avoid breaking existing callers):

```typescript
// src/contexts/dataset/application/ports/CandidateFeatureReader.ts
interface CandidateFeatureReader {
  getFeaturesForCandidates(candidateIds: UUID[]): Promise<Map<UUID, CandidateFeatures>>;
}

interface CandidateFeatures {
  turnCount: number | null;
  toolCallCount: number | null;
  language: string | null;
  hasNegativeFeedback: boolean | null;
  latencyMs: number | null;
  // response length derived at computation time
}
```

**Acceptance criteria:**
- [ ] MI computed between 6 candidate features and majority label
- [ ] Significance via G-test with Bonferroni correction
- [ ] Risk level classification (low/medium/high based on NMI thresholds)
- [ ] Gracefully degrade if Phase 2 features unavailable (return empty report with warning)
- [ ] Store anomalies in `ds_diagnostics_anomalies` table
- [ ] Separate `CandidateFeatureReader` port and `CandidateFeatureAdapter` implementation

### GET-89: Leakage Checks

**Context:** Dataset (domain service: `LeakageChecker`)

**Algorithm (uses join table for efficiency):**

```sql
-- Episode overlap across released versions in same suite
SELECT dvc.candidate_id, cd.episode_id, array_agg(DISTINCT dvc.dataset_version_id) AS versions
FROM ds_dataset_version_candidates dvc
JOIN cd_candidates cd ON cd.id = dvc.candidate_id
JOIN ds_dataset_versions dv ON dv.id = dvc.dataset_version_id
WHERE dv.suite_id = $suite_id AND dv.state = 'released'
GROUP BY dvc.candidate_id, cd.episode_id
HAVING COUNT(DISTINCT dvc.dataset_version_id) > 1;
```

**Acceptance criteria:**
- [ ] Detect episode_id overlap across released versions in same suite
- [ ] Severity: `critical` (exact candidate duplicate), `warning` (same episode, different candidate)
- [ ] **Cap duplicate entries at 1000** (store most severe first)
- [ ] Compute leakage rate as percentage
- [ ] Store anomalies in `ds_diagnostics_anomalies` table

### GET-91: Diagnostics Report API

**Context:** Dataset
**Files to create/modify:**

```
app/api/v1/dataset-versions/[id]/diagnostics/route.ts   # Enhanced GET endpoint
```

**Behavior — background job pattern:**
- State transition to `validating` enqueues diagnostics computation job
- `GET /diagnostics` returns `{ status: "computing" }` while job is running
- Once complete: returns full diagnostics report from cache
- For `released` versions: returns cached report immediately (read-only)
- Support `?slice=<name>` query parameter to filter metrics by slice
- Returns the full diagnostics report matching PRD section 8.2 schema

**Response status codes:**
- `200` — report ready
- `202` — computation in progress (`{ status: "computing" }`)
- `404` — version not found or no diagnostics report exists

**Acceptance criteria:**
- [ ] Returns all metric categories from single `metrics` JSONB column
- [ ] Per-candidate anomalies fetched from `ds_diagnostics_anomalies` table on demand
- [ ] Supports slice filtering via query param
- [ ] Includes gate results with per-gate pass/fail/blocking/scope
- [ ] Backward compatible with Phase 1 callers
- [ ] Computation runs as background job, not synchronously in request handler

---

## Wave 2: Drift Detection + Enhanced Diffs

**Duration:** ~2 weeks
**Dependencies:** Wave 1 (diagnostics metrics feed into drift, diff references diagnostics)
**Issues:** GET-99, GET-100, GET-102, GET-111, GET-114

### GET-99: Distribution Comparison Engine

**Context:** Dataset (domain service in `StatisticalUtils`)

**Algorithm — Jensen-Shannon Divergence:**

```
JSD(P || Q) = (1/2) * KL(P || M) + (1/2) * KL(Q || M)
where M = (P + Q) / 2
```

Key properties:
- Symmetric: `JSD(P||Q) = JSD(Q||P)`
- Bounded: `JSD ∈ [0, ln(2)]` in nats, `[0, 1]` in bits
- **No smoothing required** — the mixture M automatically handles zeros
- `sqrt(JSD)` is a true metric (Jensen-Shannon distance)

**Flag thresholds (in bits):**

| JSD | Interpretation |
|---|---|
| 0.0-0.05 | Negligible difference |
| 0.05-0.1 | Moderate shift — monitor |
| 0.1-0.2 | Significant — investigate |
| > 0.2 | Severe divergence — action needed |

**New port (separate adapter, not extending CandidateContextAdapter):**

```typescript
// src/contexts/dataset/application/ports/ProductionDistributionReader.ts
interface ProductionDistributionReader {
  getScenarioDistribution(days: number): Promise<Map<UUID, number>>;
  getTotalCandidateCount(days: number): Promise<number>;
}
```

**Implementation constraint:** The adapter must use a direct DB query (`COUNT(*) GROUP BY scenario_type_id` with date window filter) — not the Candidate use case layer. This is a legitimate performance exemption.

**Required index on `cd_candidates`:**

```sql
CREATE INDEX cd_candidates_scenario_created_idx
ON cd_candidates(scenario_type_id, created_at DESC);
```

**Acceptance criteria:**
- [ ] JS divergence computed on scenario type distributions (O(k) where k = scenario count)
- [ ] Per-scenario drift with direction (over/underrepresented)
- [ ] Emit `drift.detected` event when JSD exceeds configurable threshold
- [ ] Configurable time window via `days` parameter (default 30)
- [ ] Separate `CandidateDistributionAdapter` implementation

### GET-100: Stale Scenario Detection

Implemented within `ComputeDrift` use case.

**Staleness score:** `abs(production_pct - dataset_pct) / max(production_pct, dataset_pct)`

A scenario is stale if:
- Staleness score > 0.5 (configurable), OR
- No new candidates ingested for the scenario in 30 days

**Acceptance criteria:**
- [ ] Staleness score per scenario
- [ ] Differentiate "growing" (underrepresented in dataset) vs "shrinking" (overrepresented)
- [ ] Recommended actions generated: "Add N more candidates for scenario X" type suggestions

### GET-102: Drift Analysis API

`GET /api/v1/dataset-versions/:id/drift?days=30`

**Note:** Drift is computed on-demand (not cached in diagnostics report). The DriftReport is separate from the diagnostics report because it has different lifecycle characteristics (time-windowed, always fresh vs. snapshot at validation time).

**Acceptance criteria:**
- [ ] Returns drift report with JSD and per-scenario drift
- [ ] 404 if version not found, 400 if version has no candidates
- [ ] Drift results NOT stored in `ds_diagnostics_reports` (computed on demand)

### GET-111: Enhanced Diff Computation

**Label hash for efficient comparison:**

Store content hash at label finalization time on `lb_label_tasks`:

```sql
ALTER TABLE lb_label_tasks ADD COLUMN label_hash VARCHAR(32);
-- Computed as MD5(jsonb_build_object(label_value)::text)
```

Enhanced diff uses SQL to find changed candidates in a single query:

```sql
SELECT lt_a.candidate_id, lt_a.label_hash AS prev, lt_b.label_hash AS curr
FROM lb_label_tasks lt_a
JOIN lb_label_tasks lt_b ON lt_a.candidate_id = lt_b.candidate_id
WHERE lt_a.candidate_id IN (SELECT candidate_id FROM ds_dataset_version_candidates WHERE dataset_version_id = $v_a)
  AND lt_b.candidate_id IN (SELECT candidate_id FROM ds_dataset_version_candidates WHERE dataset_version_id = $v_b)
  AND lt_a.state = 'finalized' AND lt_b.state = 'finalized'
  AND lt_a.label_hash != lt_b.label_hash;
```

**Enhanced `VersionDiff` shape:**

```typescript
interface VersionDiffData {
  added: UUID[];
  removed: UUID[];
  unchanged: UUID[];
  changed: Array<{
    candidateId: UUID;
    previousLabelHash: string;
    currentLabelHash: string;
  }>;
  scenarioBreakdown: {
    added: Record<string, number>;
    removed: Record<string, number>;
    changed: Record<string, number>;
  };
  coverageDelta: {
    previousCoverage: number;
    currentCoverage: number;
    delta: number;
    newlyCoveredScenarios: string[];
    newlyUncoveredScenarios: string[];
  };
  agreementDelta: {
    previousAgreement: number;
    currentAgreement: number;
    delta: number;
  };
  summary: {
    addedCount: number;
    removedCount: number;
    changedCount: number;
    unchangedCount: number;
    netDelta: number;
  };
}
```

**Acceptance criteria:**
- [ ] Detect changed candidates via label_hash comparison (single SQL query)
- [ ] Scenario breakdown, coverage delta, agreement delta
- [ ] Backward compatible — existing diff endpoint returns enhanced data

### GET-114: Lineage Explorer API

`GET /api/v1/dataset-versions/:id/lineage`

Returns existing `lineage` JSONB enriched with scenario type names and scoring run info. Support `?candidate_id=<id>` for single-candidate drill-down. Paginate candidate list with `?page=1&page_size=100`.

**Acceptance criteria:**
- [ ] Full lineage graph for a dataset version
- [ ] Candidate-level drill-down via query param
- [ ] Enriched with scenario type names (from `ScenarioReader` port)
- [ ] Pagination with `paginated()` helper (cap at 100 per page)

---

## Wave 3: Advanced Gates + Golden Slices

**Duration:** ~1.5 weeks
**Dependencies:** Wave 1 (gate policies + diagnostics), Wave 2 (drift feeds into gates)
**Issues:** GET-123, GET-124, GET-117

### GET-123: Per-Slice Gate Evaluation

**Domain service: `GateEvaluator`**

- Load enabled policies from `ReleaseGatePolicyRepository` for the version's suite
- If no policies defined, use defaults (backward compatible)
- Evaluate `overall` scope: run against global metrics
- Evaluate `per_scenario` scope: run against each scenario's metrics
- Evaluate `per_slice` scope: run against each slice's metrics (filtered by `sliceFilter`)
- Aggregate results: blocking failures prevent release, non-blocking are warnings
- Emit `release_gate.blocked` event with failed gates detail

**Extended `GateResult`:**

```typescript
interface GateResult {
  gate: string;
  threshold: number;
  actual: number;
  passed: boolean;
  blocking: boolean;        // NEW
  scope: string;            // NEW: overall, per_scenario, per_slice
  scopeTarget: string | null; // NEW: scenario_id or slice_name
}
```

**Acceptance criteria:**
- [ ] Gate evaluation reads policies from database (not hardcoded)
- [ ] Per-scenario and per-slice evaluation with scope targets
- [ ] Blocking vs non-blocking distinction
- [ ] Backward compatible: no policies → use defaults
- [ ] `selectionPolicy` gate fields explicitly deprecated

### GET-124: Coverage Minimum Enforcement

**Acceptance criteria:**
- [ ] Coverage = % of scenario types with at least 1 candidate
- [ ] Per-risk-tier coverage (safety scenarios require higher coverage)
- [ ] Configurable minimum examples per scenario type
- [ ] Block release if any critical scenario has 0 candidates
- [ ] Coverage report stored in `metrics` JSONB on diagnostics report

### GET-117: Golden Slices

**Files to modify:**

```
src/db/schema/dataset.ts                                           # Add is_golden, locked_at, stale_candidate_ids
src/contexts/dataset/application/use-cases/ManageDatasetVersions.ts # Auto-include golden slices
src/contexts/dataset/domain/events.ts                               # Add golden_slice.locked event
app/api/v1/dataset-versions/[id]/slices/[sliceId]/state/route.ts   # PATCH with { golden: true }
```

**Database-level immutability enforcement (PostgreSQL trigger):**

```sql
CREATE OR REPLACE FUNCTION prevent_golden_slice_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_golden = TRUE THEN
    IF NEW.candidate_ids IS DISTINCT FROM OLD.candidate_ids
       OR NEW.filter IS DISTINCT FROM OLD.filter THEN
      RAISE EXCEPTION 'Cannot modify candidate_ids or filter on a golden slice (id: %)', OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER golden_slice_immutability
BEFORE UPDATE ON ds_slices
FOR EACH ROW EXECUTE FUNCTION prevent_golden_slice_mutation();
```

**Auto-clone behavior:**
- When creating a new version in a suite, clone golden slices from latest released version
- Track stale candidates in `stale_candidate_ids` JSONB array (candidates from golden slice not in new version's pool)
- Diagnostics must exclude stale candidates from coverage/agreement calculations

**Acceptance criteria:**
- [ ] Mark slices as golden via `PATCH .../state` with `{ golden: true }`
- [ ] Database-level trigger prevents modification of golden slice candidate_ids/filter
- [ ] Application-level `GoldenSliceImmutableError` thrown before trigger fires
- [ ] Unlock requires `{ golden: false, force: true }` — clears trigger, records audit
- [ ] Auto-clone to new versions with stale candidate tracking
- [ ] Emit `golden_slice.locked` domain event

---

## Wave 4: Eval Result Ingestion + Failure Loop

**Duration:** ~2 weeks
**Dependencies:** Wave 1 (diagnostics provide context for failure analysis)
**Issues:** GET-126, GET-128, GET-127

### GET-126: Eval Result Ingestion API

**Context:** Dataset
**Aggregate root:** `EvalRun` (with `EvalResultData` as value object)

**Files to create:**

```
src/db/schema/dataset.ts                                         # Add ds_eval_runs + ds_eval_results
src/contexts/dataset/domain/entities/EvalRun.ts                  # Aggregate root
src/contexts/dataset/domain/value-objects/EvalResult.ts           # Value object (NOT entity)
src/contexts/dataset/domain/events.ts                            # Add eval_run.ingested event
src/contexts/dataset/application/ports/EvalRunRepository.ts      # Port (NOT EvalResultRepository)
src/contexts/dataset/application/use-cases/ManageEvalRuns.ts     # Use case (NOT IngestEvalResults)
src/contexts/dataset/infrastructure/DrizzleEvalRunRepository.ts  # Adapter
src/contexts/dataset/index.ts                                    # Wire new use case
app/api/v1/eval-results/route.ts                                 # POST + GET
```

**Request schema (with security validations):**

```typescript
const JudgeOutputSchema = z.record(z.string(), z.unknown()).optional();
const EvalMetadataSchema = z.object({
  commitSha: z.string().optional(),
  ciUrl: z.string().url().optional(),
  pipelineId: z.string().optional(),
}).strict().optional();

const IngestEvalResultsSchema = z.object({
  datasetVersionId: z.string().uuid(),
  modelName: z.string().min(1).max(100),
  modelVersion: z.string().min(1).max(100),
  evalRunExternalId: z.string().max(200).optional(),
  results: z.array(z.object({
    candidateId: z.string().uuid(),
    passed: z.boolean(),
    score: z.number().optional(),
    judgeOutput: JudgeOutputSchema,
    failureMode: z.string().max(100).optional(),
  })).min(1).max(100_000),
  metadata: EvalMetadataSchema,
});
```

**Idempotency — partial unique index:**

```sql
CREATE UNIQUE INDEX ds_eval_runs_extid_unique
ON ds_eval_runs (dataset_version_id, model_name, model_version, eval_run_external_id)
WHERE eval_run_external_id IS NOT NULL;
```

**Bulk insert pattern (chunked, within single transaction):**

```typescript
const CHUNK_SIZE = 1_000;
await this.db.transaction(async (tx) => {
  const evalRun = await tx.insert(dsEvalRuns).values(runData).returning();
  for (let i = 0; i < results.length; i += CHUNK_SIZE) {
    const chunk = results.slice(i, i + CHUNK_SIZE);
    await tx.insert(dsEvalResults).values(chunk.map(r => ({ ...r, evalRunId: evalRun[0]!.id })));
  }
});
```

**Candidate validation (single set intersection, not N+1):**

```typescript
const versionCandidateIds = new Set(
  await this.db.select({ id: dsDatasetVersionCandidates.candidateId })
    .from(dsDatasetVersionCandidates)
    .where(eq(dsDatasetVersionCandidates.datasetVersionId, versionId))
    .then(rows => rows.map(r => r.id))
);
const invalidIds = results.filter(r => !versionCandidateIds.has(r.candidateId));
if (invalidIds.length > 0) throw new ValidationError(`${invalidIds.length} candidate IDs not in version`);
```

**Aggregate stats:** Compute `pass_rate` lazily from `ds_eval_results` at query time (not cached on `ds_eval_runs`) to prevent drift between cached aggregates and actual rows.

**Acceptance criteria:**
- [ ] Accept eval results linked to a released dataset version + model version
- [ ] Validate dataset version exists and is released (`DatasetVersionNotReleasedError`)
- [ ] Validate candidate IDs via set intersection (single query)
- [ ] Transactional bulk insert (chunked at 1000 rows, single transaction)
- [ ] Idempotent via partial unique index on `evalRunExternalId`
- [ ] Emit `eval_run.ingested` domain event
- [ ] Strict Zod schemas for metadata and judge output (no unbounded `z.unknown()`)

### GET-128: Eval Results Listing API

`GET /api/v1/eval-results` — co-located with POST handler.

**Query parameters:**
- `dataset_version_id`, `model_name`, `model_version` — filters
- `page`, `page_size` — pagination
- `aggregate=scenario|failure_mode|risk_tier` — aggregation modes

Aggregate stats (pass rate, counts) computed at query time from `ds_eval_results`:

```sql
SELECT er.eval_run_id, COUNT(*) as total, SUM(CASE WHEN er.passed THEN 1 ELSE 0 END) as passed
FROM ds_eval_results er
JOIN ds_eval_runs run ON run.id = er.eval_run_id
WHERE run.dataset_version_id = $1
GROUP BY er.eval_run_id;
```

**Acceptance criteria:**
- [ ] Filter by dataset version, model name, model version
- [ ] Pagination with `paginated()` response helper
- [ ] Aggregation modes: by scenario, failure mode, risk tier
- [ ] Summary stats computed from actual rows (not cached aggregates)

### GET-127: Failure Loop Analysis

**Use case:** `RunFailureAnalysis` (parallels `RunDiagnostics` naming)

`GET /api/v1/eval-results/failure-analysis?dataset_version_id=<id>`

**Algorithm:**
- Query eval runs for the specified dataset version
- Compare per-scenario pass rates across model versions (chronological ordering by `created_at`)
- Classify each scenario:
  - **Persistently failing:** fail rate > 50% across all model versions
  - **Newly failing:** passed in previous model (>80%), failing in current (<50%)
  - **Newly fixed:** failed in previous (<50%), passing in current (>80%)
  - **Regressing:** pass rate declining across 3+ consecutive versions
  - **Stable passing:** >80% pass rate across all versions

**Trend detection:** Linear regression on pass rate over model versions. Slope < -0.1 → degrading, > 0.1 → improving, else stable. High variance (R^2 < 0.5 with non-zero slope) → fluctuating.

**Acceptance criteria:**
- [ ] Compare eval results across model versions for same dataset version
- [ ] Requires at least 2 eval runs with different model versions (400 otherwise, `InsufficientEvalRunsError`)
- [ ] Per-scenario classification into 5 categories
- [ ] Trend detection with linear regression
- [ ] Summary statistics

---

## Dependency Graph

```
Wave 0 (Prerequisites)
├── P-1: Fix O(n²) computeRedundancy
├── P-2: Add ds_dataset_version_candidates join table
├── P-3: Extract MetricComputer strategy objects
├── P-4: Fix CandidateContextAdapter N+1
├── P-5: Add FK constraints to existing tables
├── P-6: Add DiagnosticsReportRepository port
├── P-7: Extend GateResult interface
│
Wave 1 (Foundation)
├── GET-122: Gate Policies CRUD ──────────────────────┐
├── GET-86: Agreement by Slice ──┐                    │
├── GET-87: Label Entropy ───────┤                    │
├── GET-88: Shortcut Detection ──┼── GET-91: Full ────┤
├── GET-89: Leakage Checks ──────┘   Diagnostics API  │
│                                         │            │
Wave 2 (Drift + Diffs)                   │            │
├── GET-99: Distribution Engine ──┐      │            │
├── GET-100: Stale Scenarios ─────┼── GET-102: Drift API
├── GET-111: Enhanced Diff                │            │
├── GET-114: Lineage Explorer             │            │
│                                         │            │
Wave 3 (Gates + Golden)                   │            │
├── GET-123: Per-Slice Gates ◄────────────┴────────────┘
├── GET-124: Coverage Minimums
├── GET-117: Golden Slices
│
Wave 4 (Eval Loop)
├── GET-126: Eval Ingestion API
├── GET-128: Eval Results Listing
└── GET-127: Failure Loop Analysis ◄── GET-126
```

## Acceptance Criteria

### Functional Requirements

- [ ] All 9 new API endpoints operational with proper validation
- [ ] Enhanced diagnostics report covers all 7 metric categories
- [ ] Release gates configurable per suite with per-slice evaluation
- [ ] Drift detection computes JS divergence on scenario distributions
- [ ] Version diffs show label changes, coverage delta, agreement delta
- [ ] Lineage API returns full provenance graph per version
- [ ] Golden slices locked at DB level and auto-carried forward
- [ ] Eval results ingested from CI systems with strict schema validation
- [ ] Failure loop analysis classifies scenarios across model versions

### Non-Functional Requirements

- [ ] Diagnostics computation completes in <30s for versions with 10K candidates (background job)
- [ ] Drift analysis completes in <10s (O(k) computation, k = scenario count)
- [ ] Eval result ingestion handles batches of 50K results (chunked bulk insert)
- [ ] All new tables have proper indexes, FK constraints, and CHECK constraints
- [ ] JSONB fields have size caps enforced at application layer

### Quality Gates

- [ ] All new code follows DDD/hexagonal architecture conventions
- [ ] New domain errors extend `DomainError` (8 new errors enumerated)
- [ ] Cross-context reads use port/adapter pattern with lazy imports and separate adapter files
- [ ] Zod v4 schemas validated (2-arg `z.record()`, `.nonnegative()`, strict objects for metadata)
- [ ] New events registered in `src/lib/events/registry.ts` (singular noun convention)
- [ ] Statistical computations are pure functions with NO I/O, in `domain/services/`
- [ ] `pnpm build` passes with no TypeScript errors
- [ ] `pnpm lint` passes

## Risk Analysis & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Phase 2 not complete when Phase 3 starts | High | Graceful degradation: skip feature-dependent metrics (shortcut detection) if Phase 2 data unavailable |
| Statistical computations slow on large datasets | High | Background job pattern; SQL for set ops; cap anomaly arrays; add indexes |
| Eval result schema varies across CI systems | Medium | Strict Zod schemas with `.strict()` on metadata objects; validate only required fields |
| Gate policy complexity explosion | Low | Max 20 policies per suite; CHECK constraints on metric/scope/comparison |
| RunDiagnostics becomes God Object | High | **Mitigated in Wave 0**: extract MetricComputer strategy objects before adding any metrics |
| JSONB column growth in diagnostics reports | Medium | **Mitigated**: single `metrics` column + separate `ds_diagnostics_anomalies` table for per-candidate data |
| Golden slice candidates become stale | Low | Track in `stale_candidate_ids` JSONB; exclude from diagnostics calculations |
| Dataset context accumulates too many responsibilities | Medium | Eval results provisionally in Dataset; define extraction trigger (circular reads with diagnostics = split) |

## References & Research

### Internal References

- Existing diagnostics: `src/contexts/dataset/application/use-cases/RunDiagnostics.ts`
- Gate results: `src/contexts/dataset/domain/value-objects/GateResult.ts`
- Version diff: `src/contexts/dataset/application/use-cases/ComputeVersionDiff.ts`
- Lineage VO: `src/contexts/dataset/domain/value-objects/Lineage.ts`
- Diagnostics report: `src/contexts/dataset/domain/value-objects/DiagnosticsReport.ts`
- DB schema: `src/db/schema/dataset.ts`
- Event registry: `src/lib/events/registry.ts`
- API middleware: `src/lib/api/middleware.ts`
- Intelligence scoring pattern: `src/contexts/intelligence/domain/scoring/CompositeScoringEngine.ts`

### Institutional Learnings

- `docs/solutions/integration-issues/dataset-context-versioned-suites-release-gates-patterns.md` — diagnostics, gates, auto-transitions, kappa NaN edge case (default to 1.0)
- `docs/solutions/integration-issues/labeling-context-annotation-workflow-patterns.md` — agreement as pure functions with NO I/O, label type-specific calculation
- `docs/solutions/integration-issues/bounded-context-ddd-implementation-patterns.md` — directory structure, error mapping, lazy imports for cross-context
- `docs/solutions/integration-issues/candidate-context-ddd-implementation-patterns.md` — cross-context adapters (define both get and getMany), pagination pattern

### Statistical References

- Cohen's kappa: Landis & Koch (1977) interpretation scale
- Fleiss' kappa: supports variable rater counts via per-item n_i denominators
- Krippendorff's alpha: preferred for sparse annotation data (consider as future enhancement)
- JSD: symmetric, bounded [0,1] in bits, no smoothing needed via mixture M
- MI significance: G-test with Bonferroni correction for multiple comparisons
- Chi-squared: Cochran's rule (no expected cell < 1, < 20% cells below 5); Yates' correction for 2x2
- Dataset quality diagnostics: layered stack (agreement → distribution → dependence → calibration)

### PRD Section

- PRD.md Section 8 — Phase 3: Quality & Governance (full requirements)
- PRD.md Section 8.2 — Diagnostics Report Schema (target JSON structure)
