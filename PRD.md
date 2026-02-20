# Diamond 2.0 — Product Requirements Document

**Version:** 0.1.0
**Date:** 2026-02-19
**Status:** Draft

---

## Table of Contents

1. [Vision](#1-vision)
2. [Domain-Driven Design](#2-domain-driven-design)
3. [Bounded Contexts & Domains](#3-bounded-contexts--domains)
4. [Domain Event Catalog](#4-domain-event-catalog)
5. [Domain Models & Relationships](#5-domain-models--relationships)
6. [Phase 1 — Foundation](#6-phase-1--foundation)
7. [Phase 2 — Intelligence](#7-phase-2--intelligence)
8. [Phase 3 — Quality & Governance](#8-phase-3--quality--governance)
9. [Phase 4 — Generation & Attribution](#9-phase-4--generation--attribution)
10. [API Surface](#10-api-surface)
11. [Storage Strategy](#11-storage-strategy)
12. [Glossary](#12-glossary)

---

## 1. Vision

Diamond turns production logs and expert knowledge into evaluation datasets that are **measurable**, **evolving**, and **trustworthy**.

It answers five questions continuously:

1. What scenarios matter most right now?
2. What are we missing?
3. What should we label next to maximize eval signal per dollar?
4. How trustworthy is our ground truth?
5. How did dataset changes alter model decisions over time?

---

## 2. Domain-Driven Design

### Strategic Design

Diamond decomposes into **six bounded contexts**. Each context owns its data, exposes a public API, and communicates with others through well-defined contracts (domain events or synchronous queries).

```
┌─────────────────────────────────────────────────────────────────┐
│                        Diamond 2.0                              │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ Ingestion│  │ Scenario │  │ Candidate│                      │
│  │ Context  │──│ Context  │──│ Context  │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
│       │              │             │                             │
│       │              │             │                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ Labeling │  │ Dataset  │  │ Export   │                      │
│  │ Context  │──│ Context  │──│ Context  │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Context Map

Relationships between contexts use DDD context map patterns. The arrow points from upstream (supplier) to downstream (consumer).

```
  Ingestion ──[Conformist]──▶ Candidate
                                  │
  Scenario ──[Open Host]──▶ Candidate
       │                          │
       │                   [Conformist]
       │                          ▼
       └──[Open Host]──▶    Labeling
                                  │
                           [Conformist]
                                  ▼
                              Dataset ──[Open Host]──▶ Export
                                  │
                           [Conformist]
                                  ▼
                          External Eval Systems
                          (Cobalt, Limestone)
```

| Upstream         | Downstream | Pattern                   | Description                                                                                                                        |
| ---------------- | ---------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Ingestion        | Candidate  | **Conformist**            | Candidate conforms to Episode schema as-is. No translation layer needed — Episode is a stable, simple structure.                   |
| Scenario         | Candidate  | **Open Host Service**     | Scenario exposes a versioned read API. Candidate queries it to map episodes to scenarios and fetch risk weights.                   |
| Scenario         | Labeling   | **Open Host Service**     | Labeling queries Scenario for rubric definitions. Rubric ID + version is copied into the LabelTask (snapshot, not live reference). |
| Candidate        | Labeling   | **Conformist**            | Labeling conforms to the label queue structure produced by Selection.                                                              |
| Labeling         | Dataset    | **Conformist**            | Dataset conforms to finalized label structure.                                                                                     |
| Dataset          | Export     | **Open Host Service**     | Export queries Dataset for version contents via a stable read API.                                                                 |
| External Systems | Ingestion  | **Anti-Corruption Layer** | Each connector normalizes external log formats into the Episode schema. External schemas never leak into the domain.               |

### Cross-Context References

Contexts never hold live references to entities they don't own. Instead they use:

| Strategy                  | When                                     | Example                                                       |
| ------------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| **Foreign ID**            | Referencing an entity in another context | `Candidate.episode_id` references `Episode.id`                |
| **Snapshot Value Object** | Needing a frozen copy of external state  | `LabelTask.rubric_version` pins the rubric at assignment time |
| **Domain Event Payload**  | Reacting to changes in another context   | `EpisodeIngested` carries a summary, not the full Episode     |

### Aggregate Boundaries

Each bounded context has clearly defined aggregate roots. All mutations go through the root. External references point only to aggregate root IDs.

| Context   | Aggregate Root     | Owned Entities / Value Objects                                                                                       |
| --------- | ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Ingestion | **Episode**        | EpisodeInput (VO), EpisodeOutput (VO), Trace (VO), Outcome (VO), UserSegment (VO)                                    |
| Ingestion | **BulkSource**     | SourceSchema (VO), FieldMapping (VO), ImportProgress (VO)                                                            |
| Scenario  | **ScenarioType**   | Rubric (entity, versioned), FailureMode (entity, shared), RiskTier (entity, shared), ContextProfile (entity, shared) |
| Scenario  | **ScenarioGraph**  | ScenarioGraphVersion (entity, immutable snapshot)                                                                    |
| Candidate | **Candidate**      | ScoreVector (VO), FeatureSet (VO), ScenarioMapping (VO)                                                              |
| Candidate | **SelectionRun**   | SelectionConstraints (VO), SelectionRationale (VO)                                                                   |
| Labeling  | **LabelTask**      | Label (entity), PreLabel (VO), AdjudicationRecord (VO)                                                               |
| Dataset   | **DatasetVersion** | Slice (entity), DiagnosticsReport (VO), Lineage (VO), GateResult (VO)                                                |
| Export    | **ExportJob**      | ExportFormat (VO), ExportArtifact (VO)                                                                               |

_VO = Value Object (immutable, no identity). Entity = has identity, lifecycle within aggregate._

FailureMode, RiskTier, and ContextProfile are shared reference entities within the Scenario context. They are referenced by ID from ScenarioType but have independent lifecycles. They are **not** aggregate roots — they are managed through the Scenario context's API but can be referenced by multiple ScenarioTypes.

### Hexagonal Architecture (Ports & Adapters)

Each bounded context follows hexagonal architecture. **Inbound ports** define what the context can do (use cases). **Outbound ports** define what the context needs from infrastructure or other contexts.

#### 2.1 Ingestion Context — Ports

**Inbound Ports (Driving)**

| Port                 | Description                                                 | Adapter(s)                               |
| -------------------- | ----------------------------------------------------------- | ---------------------------------------- |
| `IngestEpisode`      | Accept raw data, validate, redact PII, persist              | REST API, Webhook receiver, CLI importer |
| `GetEpisode`         | Retrieve a stored episode by ID                             | REST API                                 |
| `ListEpisodes`       | Filter/paginate episodes                                    | REST API                                 |
| `CreateBulkSource`   | Reference an external dataset for import                    | REST API                                 |
| `DiscoverSchema`     | Scan a dataset file and discover columns/types/samples      | REST API                                 |
| `SubmitFieldMapping` | Define how source columns map to Episode fields             | REST API                                 |
| `PreviewBulkImport`  | Preview N rows transformed through the mapping (no persist) | REST API                                 |
| `StartBulkImport`    | Batch-ingest mapped rows through the Episode pipeline       | REST API                                 |
| `GetBulkSource`      | Retrieve a BulkSource with status and progress              | REST API                                 |
| `ListBulkSources`    | Filter/paginate BulkSources                                 | REST API                                 |

**Outbound Ports (Driven)**

| Port                   | Description                                         | Adapter(s)                                             |
| ---------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| `EpisodeRepository`    | Persist and query episode metadata                  | PostgreSQL adapter                                     |
| `BulkSourceRepository` | Persist BulkSource state, schema, mapping, progress | PostgreSQL adapter                                     |
| `ArtifactStore`        | Store raw episode artifacts (transcripts, traces)   | S3-compatible adapter                                  |
| `PIIRedactor`          | Detect and redact PII from episode content          | Rule-based adapter, LLM-based adapter (future)         |
| `TabularDataSource`    | Discover schema and read rows from tabular files    | DuckDB adapter (CSV, Parquet, JSONL, DuckDB)           |
| `EventPublisher`       | Publish domain events to other contexts             | In-process event bus (Phase 1), message queue (future) |

---

#### 2.2 Scenario Context — Ports

**Inbound Ports (Driving)**

| Port                    | Description                                  | Adapter(s)           |
| ----------------------- | -------------------------------------------- | -------------------- |
| `ManageScenarioTypes`   | CRUD for scenario types with graph mutations | REST API, Admin UI   |
| `ManageFailureModes`    | CRUD for failure modes                       | REST API             |
| `ManageRiskTiers`       | CRUD for risk tiers                          | REST API             |
| `ManageContextProfiles` | CRUD for context profiles                    | REST API             |
| `ManageRubrics`         | CRUD + versioning for rubrics                | REST API             |
| `GetScenarioGraph`      | Read scenario graph at a specific version    | REST API (Open Host) |
| `GetRubric`             | Read rubric at a specific version            | REST API (Open Host) |

**Outbound Ports (Driven)**

| Port                 | Description                            | Adapter(s)           |
| -------------------- | -------------------------------------- | -------------------- |
| `ScenarioRepository` | Persist scenario types, graph versions | PostgreSQL adapter   |
| `RubricRepository`   | Persist rubric versions                | PostgreSQL adapter   |
| `EventPublisher`     | Publish graph/rubric changes           | In-process event bus |

---

#### 2.3 Candidate Context — Ports

**Inbound Ports (Driving)**

| Port                  | Description                                            | Adapter(s)                                  |
| --------------------- | ------------------------------------------------------ | ------------------------------------------- |
| `CreateCandidate`     | Create candidate from episode (manual or event-driven) | REST API, Event handler (`EpisodeIngested`) |
| `GetCandidate`        | Retrieve candidate with scores and features            | REST API                                    |
| `ListCandidates`      | Filter/paginate candidates                             | REST API                                    |
| `TriggerScoringRun`   | Score all unscored candidates (Phase 2)                | REST API, Scheduler                         |
| `TriggerSelectionRun` | Run budgeted optimizer to select candidates (Phase 2)  | REST API, Scheduler                         |
| `GetCoverage`         | Compute coverage report (Phase 2)                      | REST API                                    |

**Outbound Ports (Driven)**

| Port                  | Description                                              | Adapter(s)                     |
| --------------------- | -------------------------------------------------------- | ------------------------------ |
| `CandidateRepository` | Persist candidates and state transitions                 | PostgreSQL adapter             |
| `FeatureStore`        | Store and query embeddings + derived features            | PostgreSQL + pgvector adapter  |
| `EpisodeReader`       | Read episode content from Ingestion context              | Internal API call to Ingestion |
| `ScenarioReader`      | Read scenario graph and risk tiers from Scenario context | Internal API call to Scenario  |
| `EmbeddingService`    | Compute embeddings for text (Phase 2)                    | LLM API adapter                |
| `EventPublisher`      | Publish scoring/selection/cluster events                 | In-process event bus           |

---

#### 2.4 Labeling Context — Ports

**Inbound Ports (Driving)**

| Port                  | Description                                                    | Adapter(s)                                        |
| --------------------- | -------------------------------------------------------------- | ------------------------------------------------- |
| `CreateLabelTask`     | Create a task for a candidate (manual or from selection queue) | REST API, Event handler (`SelectionRunCompleted`) |
| `AssignTask`          | Assign a task to an annotator                                  | REST API, Auto-assignment service                 |
| `SubmitLabel`         | Submit an annotation for a task                                | REST API, Annotation UI                           |
| `TriggerAdjudication` | Force adjudication on a disagreed task                         | REST API, Automatic disagreement detector         |
| `FinalizeTask`        | Mark task as finalized after review/adjudication               | REST API                                          |
| `ListLabelTasks`      | Filter/paginate tasks by state, assignee, scenario             | REST API                                          |

**Outbound Ports (Driven)**

| Port                  | Description                                            | Adapter(s)                     |
| --------------------- | ------------------------------------------------------ | ------------------------------ |
| `LabelTaskRepository` | Persist tasks and labels                               | PostgreSQL adapter             |
| `RubricReader`        | Read rubric definition + version from Scenario context | Internal API call to Scenario  |
| `CandidateReader`     | Read candidate content for display to annotator        | Internal API call to Candidate |
| `PreLabelService`     | Generate LLM-assisted label suggestions (Phase 2)      | LLM API adapter                |
| `EventPublisher`      | Publish label lifecycle events                         | In-process event bus           |

---

#### 2.5 Dataset Context — Ports

**Inbound Ports (Driving)**

| Port                     | Description                                      | Adapter(s)                                 |
| ------------------------ | ------------------------------------------------ | ------------------------------------------ |
| `CreateDatasetSuite`     | Create a named suite                             | REST API                                   |
| `CreateDatasetVersion`   | Create a draft version from candidate IDs        | REST API                                   |
| `AddCandidatesToVersion` | Add labeled candidates to a draft version        | REST API, Event handler (`LabelFinalized`) |
| `RunDiagnostics`         | Compute quality diagnostics for a version        | REST API, Pre-release hook                 |
| `ReleaseVersion`         | Transition version from draft → released (gated) | REST API                                   |
| `DeprecateVersion`       | Mark a version as deprecated                     | REST API                                   |
| `GetVersionDiff`         | Compute diff between two versions                | REST API                                   |
| `IngestEvalResults`      | Accept eval results from CI (Phase 3)            | REST API, Webhook                          |

**Outbound Ports (Driven)**

| Port                | Description                                  | Adapter(s)                     |
| ------------------- | -------------------------------------------- | ------------------------------ |
| `DatasetRepository` | Persist suites, versions, slices             | PostgreSQL adapter             |
| `CandidateReader`   | Read candidate details for version assembly  | Internal API call to Candidate |
| `LabelReader`       | Read finalized labels for version assembly   | Internal API call to Labeling  |
| `ScenarioReader`    | Read scenario graph for coverage computation | Internal API call to Scenario  |
| `DiagnosticsEngine` | Compute agreement, redundancy, drift metrics | Internal service               |
| `EventPublisher`    | Publish version lifecycle events             | In-process event bus           |

---

#### 2.6 Export Context — Ports

**Inbound Ports (Driving)**

| Port              | Description                               | Adapter(s)                                         |
| ----------------- | ----------------------------------------- | -------------------------------------------------- |
| `TriggerExport`   | Start an export job for a dataset version | REST API, Event handler (`DatasetVersionReleased`) |
| `GetExportStatus` | Check job status and download URL         | REST API                                           |

**Outbound Ports (Driven)**

| Port                  | Description                                           | Adapter(s)                   |
| --------------------- | ----------------------------------------------------- | ---------------------------- |
| `DatasetReader`       | Read version contents from Dataset context            | Internal API call to Dataset |
| `ArtifactStore`       | Write export artifacts                                | S3-compatible adapter        |
| `ExportJobRepository` | Persist job status                                    | PostgreSQL adapter           |
| `FormatSerializer`    | Serialize to target format (JSONL, Cobalt, Limestone) | Format-specific adapters     |

---

## 3. Bounded Contexts & Domains

### 3.1 Ingestion Context

**Responsibility:** Accept raw production data, normalize it into Episodes, enforce privacy policies.

**Owns:**

- Connectors (log sources, event streams, warehouses)
- Normalization rules
- PII redaction pipeline
- Episode aggregate (canonical form)
- BulkSource aggregate (schema-agnostic dataset import)

**Does NOT own:** What the episode means (scenario mapping), whether it's useful (scoring), or how it's labeled.

**Key invariants:**

- Every Episode has a stable `episode_id` derived from source + trace identifiers
- PII redaction runs before any persistence
- Raw artifacts stored immutably in object storage; structured metadata in OLAP store
- BulkSource schema discovery runs via DuckDB before any mapping or ingestion
- BulkSource field mapping is validated against discovered schema before import
- Bulk-imported episodes flow through the same pipeline as individually ingested episodes (dedup, PII, artifacts, events)

**Emits events:** `EpisodeIngested`, `BulkImportCompleted`
**Consumes events:** (none — source context)

---

### 3.2 Scenario Context

**Responsibility:** Define and maintain the taxonomy of what matters — scenario types, failure modes, risk tiers, and context profiles.

**Owns:**

- ScenarioType (intent / task family)
- FailureMode (hallucination, refusal error, tool misuse, policy violation, retrieval miss)
- RiskTier (business, safety, compliance — each with a numeric weight)
- ContextProfile (short/long context, multi-turn, multilingual, tool-heavy)
- Rubric (what "correct" means for a scenario)
- Scenario Graph (directed graph of relationships and inheritance)

**Does NOT own:** Episodes, candidates, labels, or datasets.

**Key invariants:**

- Scenario Graph is versioned; every mutation creates a new `ScenarioGraphVersion`
- Rubrics cascade down the graph via inheritance unless explicitly overridden
- A ScenarioType can declare required FailureModes and required ContextProfiles

**Emits events:** `ScenarioGraphUpdated`, `RubricVersionCreated`
**Consumes events:** `UnmappedClusterDetected` (from Candidate — surfaces new scenario suggestions)

---

### 3.3 Candidate Context

**Responsibility:** Score, rank, and select episodes for labeling. This is where the optimization intelligence lives.

**Owns:**

- Candidate (an episode enriched with scores and features)
- Feature Store (embeddings, derived metrics)
- Scoring Engine (multi-objective score vector per candidate)
- Selection Engine (budgeted optimizer)
- Label Queue (ordered list of candidates to label next, with rationale)

**Does NOT own:** The episode content (reads from Ingestion), the scenario definitions (reads from Scenario), or the labels (produced by Labeling).

**Key invariants:**

- A Candidate references an `episode_id` but does not duplicate episode content
- Score vectors are recomputed when the Scenario Graph version changes
- Selection runs are versioned and reproducible (parameters + input snapshot → deterministic output)

**Emits events:** `CandidateCreated`, `CandidateScored`, `CandidateSelected`, `SelectionRunCompleted`, `UnmappedClusterDetected`
**Consumes events:** `EpisodeIngested` (from Ingestion), `ScenarioGraphUpdated` (from Scenario), `LabelFinalized` (from Labeling)

---

### 3.4 Labeling Context

**Responsibility:** Manage the annotation workflow — from pre-labeling suggestions through expert review, disagreement detection, and adjudication.

**Owns:**

- LabelTask (a unit of work assigned to an annotator)
- Label (the annotation itself — discrete, extractive, generative, rubric-based, or set-valued)
- Annotator (role, expertise, agreement history)
- AdjudicationPanel (triggered on disagreement)
- LabelDistribution (stores full distribution, not just majority vote)

**Does NOT own:** What should be labeled next (that's Candidate/Selection), or what the rubric says (that's Scenario).

**Key invariants:**

- Every Label has provenance: annotator, timestamp, rubric version, guidelines version
- Labels are append-only; edits create new label versions
- Disagreement is measured continuously; adjudication triggers when agreement drops below threshold per scenario slice

**Emits events:** `LabelTaskCreated`, `LabelSubmitted`, `AdjudicationTriggered`, `LabelFinalized`
**Consumes events:** `SelectionRunCompleted` (from Candidate), `RubricVersionCreated` (from Scenario — informational, does not retroactively change pinned tasks)

---

### 3.5 Dataset Context

**Responsibility:** Assemble labeled candidates into versioned, diffable, gateable dataset releases.

**Owns:**

- DatasetSuite (a named collection, e.g. "Core", "High Risk", "Tool Use")
- DatasetVersion (an immutable build of a suite)
- Slice (a subset by scenario, risk, time, segment)
- Diagnostics Report (quality metrics for a version)
- Release Gate (rules that block release if quality is insufficient)
- Lineage (which candidates, labels, rubrics, policies, and scenario graph version produced this)

**Does NOT own:** The labels (reads from Labeling), the candidates (reads from Candidate), or the scenarios (reads from Scenario).

**Key invariants:**

- A DatasetVersion is immutable once released
- Every version links to its full lineage
- Diffs between versions are computable: added/removed/changed examples, coverage delta, performance delta

**Emits events:** `DatasetVersionCreated`, `DiagnosticsCompleted`, `DatasetVersionReleased`, `DatasetVersionDeprecated`, `ReleaseGateBlocked`
**Consumes events:** `LabelFinalized` (from Labeling — candidate becomes eligible for dataset inclusion)

---

### 3.6 Export Context

**Responsibility:** Serialize dataset versions into formats consumable by evaluation runners and CI systems.

**Owns:**

- Export Format (JSONL, Cobalt suite format, Limestone judge specs, custom)
- Export Job (tracks serialization runs)
- Integration Config (target system credentials, format preferences)

**Does NOT own:** The dataset content (reads from Dataset).

**Key invariants:**

- Exports are deterministic: same DatasetVersion + same format = identical output
- Exports include metadata header (version, lineage hash, diagnostics summary)

**Emits events:** `ExportCompleted`, `ExportFailed`
**Consumes events:** `DatasetVersionReleased` (from Dataset — triggers auto-export if configured)

---

## 4. Domain Event Catalog

All cross-context communication happens through domain events. Events are immutable facts. Each event has a stable schema versioned independently of the producing context.

### Event Infrastructure

**Phase 1:** In-process event bus (synchronous dispatch within the same application process). Simple, no infrastructure. Events are function calls behind an interface.

**Phase 2+:** If contexts are deployed as separate services, swap the adapter to a message queue (e.g., PostgreSQL LISTEN/NOTIFY, or a dedicated broker). The port interface (`EventPublisher` / `EventSubscriber`) stays the same.

**Ordering guarantee:** Events from a single aggregate are ordered. Events across aggregates are not.

**Idempotency:** All event handlers must be idempotent. Events carry an `event_id` (UUID) for deduplication.

### 4.1 Event Definitions

Every event follows this envelope:

```
{
  "event_id":    UUID,          # Unique, for deduplication
  "event_type":  string,        # e.g. "episode.ingested"
  "occurred_at": timestamp,     # When the domain fact happened
  "aggregate_id": UUID,         # ID of the aggregate root that emitted this
  "payload":     { ... }        # Event-specific data (see below)
}
```

#### Ingestion Context Events

**`episode.ingested`** — An episode has been accepted, redacted, and persisted.

| Payload Field           | Type      | Description                                           |
| ----------------------- | --------- | ----------------------------------------------------- |
| `episode_id`            | UUID      | The persisted episode ID                              |
| `source`                | string    | Origin system                                         |
| `occurred_at`           | timestamp | When the interaction happened in production           |
| `model_version`         | string    | Which model produced the output                       |
| `user_segment`          | object    | `{ locale, plan_tier, device }` — lightweight summary |
| `has_negative_feedback` | bool      | Quick signal for prioritization                       |
| `artifact_uri`          | string    | Object store URI for full episode content             |

_Note: The payload is a summary. Consumers that need full episode content use the `artifact_uri` or call the `EpisodeReader` port._

**`bulk_import.completed`** — A bulk source import has finished processing all rows.

| Payload Field       | Type    | Description                                     |
| ------------------- | ------- | ----------------------------------------------- |
| `bulk_source_id`    | UUID    | The BulkSource that completed                   |
| `source_label`      | string  | The Episode.source value used for imported rows |
| `total_rows`        | integer | Total rows in the source file                   |
| `rows_succeeded`    | integer | Episodes successfully created                   |
| `rows_failed`       | integer | Rows that failed ingestion                      |
| `rows_deduplicated` | integer | Rows skipped due to dedup                       |
| `status`            | string  | `completed` or `completed_with_errors`          |

_Note: Each individual episode also emits `episode.ingested` during the import. This summary event fires once at the end._

---

#### Scenario Context Events

**`scenario_graph.updated`** — The scenario graph has been mutated (type added/removed/modified, failure modes changed, etc.).

| Payload Field      | Type     | Description                      |
| ------------------ | -------- | -------------------------------- | ---------- | ---------------------------------------------- |
| `previous_version` | string   | The version before this mutation |
| `new_version`      | string   | The new immutable version        |
| `changes`          | object[] | `[{ change_type: "added"         | "modified" | "removed", entity_type, entity_id, summary }]` |

_Consumer: Candidate context — triggers re-scoring of candidates whose scenario mappings are affected._

**`rubric.version_created`** — A new version of a rubric has been published.

| Payload Field      | Type    | Description                            |
| ------------------ | ------- | -------------------------------------- |
| `rubric_id`        | UUID    | The rubric                             |
| `scenario_type_id` | UUID    | The scenario this rubric belongs to    |
| `previous_version` | integer | Old version number                     |
| `new_version`      | integer | New version number                     |
| `change_summary`   | string  | Human-readable summary of what changed |

_Consumer: Labeling context — informational. In-progress tasks keep their pinned version. New tasks use the latest._

---

#### Candidate Context Events

**`candidate.created`** — A new candidate has been created from an episode.

| Payload Field  | Type   | Description                |
| -------------- | ------ | -------------------------- |
| `candidate_id` | UUID   | The new candidate          |
| `episode_id`   | UUID   | Source episode             |
| `state`        | string | Always `"raw"` at creation |

**`candidate.scored`** — A candidate's score vector has been computed or updated (Phase 2).

| Payload Field        | Type   | Description                        |
| -------------------- | ------ | ---------------------------------- |
| `candidate_id`       | UUID   | The scored candidate               |
| `score_vector`       | object | The 8-dimension score vector       |
| `scenario_type_id`   | UUID?  | Mapped scenario (null if unmapped) |
| `mapping_confidence` | float  | Confidence of the mapping          |
| `scoring_run_id`     | UUID   | Which scoring run produced this    |

**`candidate.selected`** — A candidate has been picked by the selection engine for labeling (Phase 2).

| Payload Field      | Type    | Description                     |
| ------------------ | ------- | ------------------------------- |
| `candidate_id`     | UUID    | The selected candidate          |
| `selection_run_id` | UUID    | Which selection run             |
| `rationale`        | string  | Why this candidate was selected |
| `priority`         | integer | Position in the label queue     |

**`selection_run.completed`** — A selection run has finished, producing a label queue (Phase 2).

| Payload Field           | Type    | Description                       |
| ----------------------- | ------- | --------------------------------- |
| `selection_run_id`      | UUID    | The run                           |
| `candidate_count`       | integer | How many candidates were selected |
| `budget`                | integer | The budget that was provided      |
| `constraints_satisfied` | bool    | Whether all constraints were met  |
| `coverage_improvement`  | float   | Projected coverage improvement    |

_Consumer: Labeling context — creates LabelTasks for the selected candidates._

**`cluster.unmapped_detected`** — Clustering has found a group of episodes that don't map to any known scenario (Phase 2).

| Payload Field                | Type    | Description                               |
| ---------------------------- | ------- | ----------------------------------------- |
| `cluster_id`                 | string  | Internal cluster identifier               |
| `episode_count`              | integer | How many episodes in this cluster         |
| `representative_episode_ids` | UUID[]  | A few example episode IDs                 |
| `centroid_summary`           | string  | Auto-generated description of the cluster |

_Consumer: Scenario context — surfaces as a suggestion for domain experts to review and potentially create a new ScenarioType._

---

#### Labeling Context Events

**`label_task.created`** — A new labeling task has been created.

| Payload Field    | Type    | Description              |
| ---------------- | ------- | ------------------------ |
| `label_task_id`  | UUID    | The task                 |
| `candidate_id`   | UUID    | Which candidate to label |
| `rubric_id`      | UUID    | Which rubric to use      |
| `rubric_version` | integer | Pinned rubric version    |

**`label.submitted`** — An annotator has submitted a label for a task.

| Payload Field   | Type   | Description                                                           |
| --------------- | ------ | --------------------------------------------------------------------- |
| `label_id`      | UUID   | The label                                                             |
| `label_task_id` | UUID   | The task                                                              |
| `annotator_id`  | UUID   | Who submitted                                                         |
| `label_type`    | string | `discrete`, `extractive`, `generative`, `rubric_scored`, `set_valued` |

**`adjudication.triggered`** — Disagreement detected on a task, adjudication panel convened.

| Payload Field         | Type   | Description                                     |
| --------------------- | ------ | ----------------------------------------------- |
| `label_task_id`       | UUID   | The task                                        |
| `disagreement_metric` | float  | Measured disagreement (e.g., 1 - Cohen's kappa) |
| `label_ids`           | UUID[] | The conflicting labels                          |

**`label_task.finalized`** — A task has been fully resolved with a final label.

| Payload Field        | Type   | Description                                           |
| -------------------- | ------ | ----------------------------------------------------- |
| `label_task_id`      | UUID   | The task                                              |
| `candidate_id`       | UUID   | The labeled candidate                                 |
| `final_label_id`     | UUID   | The authoritative label                               |
| `label_distribution` | object | Full distribution of annotations, not just the winner |
| `agreement_score`    | float  | Inter-annotator agreement for this task               |

_Consumers: Candidate context (transitions candidate to `labeled`), Dataset context (candidate becomes eligible for inclusion)._

---

#### Dataset Context Events

**`dataset_version.created`** — A new draft version has been created.

| Payload Field        | Type   | Description   |
| -------------------- | ------ | ------------- |
| `dataset_version_id` | UUID   | The version   |
| `suite_id`           | UUID   | Which suite   |
| `version`            | string | Semver string |

**`diagnostics.completed`** — Quality diagnostics have been computed for a version.

| Payload Field        | Type     | Description                             |
| -------------------- | -------- | --------------------------------------- |
| `dataset_version_id` | UUID     | The version                             |
| `diagnostics_id`     | UUID     | The diagnostics report                  |
| `blocked`            | bool     | Whether any release gate failed         |
| `gate_results`       | object[] | `[{ gate, threshold, actual, passed }]` |

**`dataset_version.released`** — A version has passed all gates and been released.

| Payload Field           | Type    | Description              |
| ----------------------- | ------- | ------------------------ |
| `dataset_version_id`    | UUID    | The version              |
| `suite_id`              | UUID    | Which suite              |
| `version`               | string  | Semver string            |
| `candidate_count`       | integer | How many examples        |
| `scenario_coverage_pct` | float   | Coverage at release time |

_Consumer: Export context — triggers auto-export if configured._

**`dataset_version.deprecated`** — A version has been marked as deprecated.

| Payload Field        | Type   | Description           |
| -------------------- | ------ | --------------------- |
| `dataset_version_id` | UUID   | The version           |
| `reason`             | string | Why it was deprecated |

**`release_gate.blocked`** — A release attempt was blocked by quality gates.

| Payload Field        | Type     | Description                     |
| -------------------- | -------- | ------------------------------- |
| `dataset_version_id` | UUID     | The version                     |
| `failed_gates`       | object[] | `[{ gate, threshold, actual }]` |

---

#### Export Context Events

**`export.completed`** — An export job finished successfully.

| Payload Field        | Type   | Description       |
| -------------------- | ------ | ----------------- |
| `export_job_id`      | UUID   | The job           |
| `dataset_version_id` | UUID   | What was exported |
| `format`             | string | Output format     |
| `artifact_uri`       | string | Download URI      |

**`export.failed`** — An export job failed.

| Payload Field        | Type   | Description             |
| -------------------- | ------ | ----------------------- |
| `export_job_id`      | UUID   | The job                 |
| `dataset_version_id` | UUID   | What was being exported |
| `error`              | string | Failure reason          |

### 4.2 Event Flow Diagram

The complete event flow across contexts, ordered by the typical lifecycle:

```
  INGESTION                 CANDIDATE                  LABELING                 DATASET              EXPORT
  ─────────                 ─────────                  ────────                 ───────              ──────

  episode.ingested ────────▶ candidate.created
                                  │
                             (Phase 2)
                                  │
  SCENARIO                        ▼
  ────────                   candidate.scored
                                  │
  scenario_graph.updated ───▶ (re-score)
                                  │
                                  ▼
                            candidate.selected
                                  │
                            selection_run.completed ──▶ label_task.created
                                                            │
  rubric.version_created ──────────────────────────▶ (informational)
                                                            │
                                                            ▼
                                                       label.submitted
                                                            │
                                                      [disagreement?]
                                                            │
                                                   adjudication.triggered
                                                            │
                                                            ▼
                            (state → labeled) ◀──── label_task.finalized ────▶ (eligible for dataset)
                                                                                     │
                                                                                     ▼
                                                                              dataset_version.created
                                                                                     │
                                                                              diagnostics.completed
                                                                                     │
                                                                               [gates pass?]
                                                                                     │
                                                                              dataset_version.released ──▶ export.completed
                                                                                                            or
  cluster.unmapped_detected ──▶ SCENARIO                                                              export.failed
  (suggests new ScenarioType)
```

### 4.3 State Machines

#### Candidate State Machine

```
                              ┌─────────────────────────────────────┐
                              │                                     │
                              ▼                                     │
  ┌─────┐    episode      ┌────────┐   scoring    ┌────────┐       │
  │ New │───ingested──▶│  raw   │───run────▶│ scored │       │
  └─────┘              └────────┘           └────────┘       │
                              │                   │           │
                         (manual select,     (selection       │
                          Phase 1)            run, Phase 2)   │
                              │                   │           │
                              ▼                   ▼           │
                         ┌──────────┐                         │
                         │ selected │                         │
                         └──────────┘                         │
                              │                               │
                         label_task                           │
                         .finalized                           │
                              │                               │
                              ▼                               │
                         ┌──────────┐                         │
                         │ labeled  │                         │
                         └──────────┘                         │
                              │                               │
                         diagnostics                          │
                         pass                                 │
                              │                               │
                              ▼                               │
                         ┌───────────┐                        │
                         │ validated │                        │
                         └───────────┘                        │
                              │                               │
                         dataset_version                      │
                         .released                            │
                              │                               │
                              ▼                               │
                         ┌──────────┐   scenario_graph        │
                         │ released │───.updated──────────────┘
                         └──────────┘   (re-score → raw)
```

| Transition      | From        | To          | Trigger                                              | Phase |
| --------------- | ----------- | ----------- | ---------------------------------------------------- | ----- |
| Create          | (none)      | `raw`       | `episode.ingested` event or manual creation          | 1     |
| Score           | `raw`       | `scored`    | Scoring run completes                                | 2     |
| Select (manual) | `raw`       | `selected`  | Manual selection via API                             | 1     |
| Select (auto)   | `scored`    | `selected`  | Selection run picks candidate                        | 2     |
| Label           | `selected`  | `labeled`   | `label_task.finalized` event                         | 1     |
| Validate        | `labeled`   | `validated` | Diagnostics pass for the containing version          | 1     |
| Release         | `validated` | `released`  | `dataset_version.released` event                     | 1     |
| Re-score        | `released`  | `raw`       | `scenario_graph.updated` event (invalidates mapping) | 2     |

**Invariant:** State can only move forward (raw → scored → selected → labeled → validated → released), except for the re-score loop which resets to `raw`.

#### LabelTask State Machine

```
  ┌─────────┐   assign   ┌─────────────┐   submit    ┌────────┐
  │ pending │──────────▶│ in_progress │──────────▶│ review │
  └─────────┘           └─────────────┘           └────────┘
                                                      │
                                              ┌───────┴───────┐
                                              │               │
                                        [agreement OK]  [disagreement]
                                              │               │
                                              ▼               ▼
                                       ┌───────────┐  ┌───────────────┐
                                       │ finalized │  │ adjudication  │
                                       └───────────┘  └───────────────┘
                                                             │
                                                        [resolved]
                                                             │
                                                             ▼
                                                       ┌───────────┐
                                                       │ finalized │
                                                       └───────────┘
```

| Transition        | From           | To             | Trigger                                       | Condition             |
| ----------------- | -------------- | -------------- | --------------------------------------------- | --------------------- |
| Assign            | `pending`      | `in_progress`  | Annotator assigned (manual or auto)           | —                     |
| Submit            | `in_progress`  | `review`       | First label submitted                         | —                     |
| Finalize (direct) | `review`       | `finalized`    | Sufficient labels + agreement above threshold | Agreement OK          |
| Adjudicate        | `review`       | `adjudication` | Agreement below threshold                     | Disagreement detected |
| Resolve           | `adjudication` | `finalized`    | Adjudication panel produces final label       | Panel decision        |

#### DatasetVersion State Machine

```
  ┌───────┐   diagnostics   ┌────────────┐   gates pass   ┌──────────┐
  │ draft │───────────────▶│ validating │──────────────▶│ released │
  └───────┘                └────────────┘               └──────────┘
                                  │                          │
                            [gates fail]                [superseded]
                                  │                          │
                                  ▼                          ▼
                            ┌───────┐                ┌────────────┐
                            │ draft │ (back)         │ deprecated │
                            └───────┘                └────────────┘
```

| Transition | From         | To           | Trigger                                         |
| ---------- | ------------ | ------------ | ----------------------------------------------- |
| Validate   | `draft`      | `validating` | `RunDiagnostics` command                        |
| Release    | `validating` | `released`   | All gates pass                                  |
| Reject     | `validating` | `draft`      | Any gate fails — back to draft for fixes        |
| Deprecate  | `released`   | `deprecated` | Manual deprecation or superseded by new version |

---

## 5. Domain Models & Relationships

### 5.1 Entity Relationship Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  INGESTION              SCENARIO                 CANDIDATE              │
│  ─────────              ────────                 ─────────              │
│                                                                         │
│  ┌────────┐         ┌──────────────┐          ┌───────────┐            │
│  │Episode │────────▶│ScenarioType  │◀────────│ Candidate │            │
│  │        │  mapped │              │  mapped  │           │            │
│  │        │  to     │   ┌──────┐   │  to      │  scores[] │            │
│  └────────┘         │   │Rubric│   │          │  features │            │
│      │              │   └──────┘   │          │  state    │            │
│      │              └──────────────┘          └───────────┘            │
│      │                     │                       │                    │
│      │              ┌──────────────┐               │                    │
│      │              │FailureMode   │               │                    │
│      │              └──────────────┘               │                    │
│      │              ┌──────────────┐               │                    │
│      │              │RiskTier      │               │                    │
│      │              └──────────────┘               │                    │
│      │              ┌──────────────┐               │                    │
│      │              │ContextProfile│               │                    │
│      │              └──────────────┘               │                    │
│      │                                             │                    │
│  LABELING               DATASET                  EXPORT                │
│  ────────               ───────                  ──────                │
│      │                                             │                    │
│  ┌────────────┐     ┌────────────────┐     ┌─────────────┐            │
│  │ LabelTask  │     │ DatasetSuite   │     │ ExportJob   │            │
│  │            │     │                │     │             │            │
│  │  ┌──────┐  │     │ ┌────────────┐ │     │  format     │            │
│  │  │Label │  │────▶│ │DatasetVer. │ │────▶│  target     │            │
│  │  └──────┘  │     │ │            │ │     └─────────────┘            │
│  │            │     │ │ ┌────────┐ │ │                                │
│  │  annotator │     │ │ │ Slice  │ │ │                                │
│  │  rubric_v  │     │ │ └────────┘ │ │                                │
│  └────────────┘     │ │diagnostics│ │                                │
│                     │ │lineage    │ │                                │
│                     │ └────────────┘ │                                │
│                     └────────────────┘                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Core Entities

#### Episode (Ingestion Context)

| Field           | Type      | Description                                |
| --------------- | --------- | ------------------------------------------ |
| `id`            | UUID      | Stable identifier                          |
| `source`        | string    | Origin system identifier                   |
| `ingested_at`   | timestamp | When Diamond received it                   |
| `occurred_at`   | timestamp | When it happened in production             |
| `inputs`        | object    | User messages, context, system prompt hash |
| `outputs`       | object    | Model responses                            |
| `trace`         | object    | Tool calls, retrieval events, latency      |
| `outcomes`      | object    | User feedback, escalation, abandonment     |
| `user_segment`  | object    | Persona, plan tier, locale, device         |
| `model_version` | string    | Which model produced the output            |
| `metadata`      | object    | Arbitrary key-value pairs from source      |

#### BulkSource (Ingestion Context)

| Field               | Type      | Description                                                                                    |
| ------------------- | --------- | ---------------------------------------------------------------------------------------------- |
| `id`                | UUID      | Stable identifier                                                                              |
| `name`              | string    | Human-readable name for this import                                                            |
| `uri`               | string    | File path or S3 URI to the source dataset                                                      |
| `format`            | string?   | Auto-detected file format (csv, parquet, jsonl, duckdb)                                        |
| `status`            | enum      | `pending`, `discovered`, `mapped`, `importing`, `completed`, `completed_with_errors`, `failed` |
| `source_label`      | string    | Becomes `Episode.source` for dedup isolation (default: `bulk:{id}`)                            |
| `discovered_schema` | object?   | `{ columns: [{ name, type, nullable, sample_values }], row_count }`                            |
| `field_mapping`     | object?   | User-defined column → Episode field mapping                                                    |
| `file_checksum`     | string?   | SHA-256 at discovery time for change detection                                                 |
| `import_progress`   | object?   | `{ total, processed, succeeded, failed, deduplicated, started_at, completed_at }`              |
| `error_log`         | object[]? | Row-level errors capped at 1000 entries                                                        |

#### ScenarioType (Scenario Context)

| Field              | Type   | Description                            |
| ------------------ | ------ | -------------------------------------- |
| `id`               | UUID   | Stable identifier                      |
| `name`             | string | Human-readable name                    |
| `description`      | string | What this scenario represents          |
| `parent_id`        | UUID?  | Parent scenario (for inheritance)      |
| `failure_modes`    | UUID[] | Expected failure modes                 |
| `context_profiles` | UUID[] | Applicable context profiles            |
| `rubric_ids`       | UUID[] | How to evaluate correctness            |
| `risk_tier_id`     | UUID   | Business/safety/compliance risk        |
| `graph_version`    | string | Scenario graph version this belongs to |

#### FailureMode (Scenario Context)

| Field         | Type   | Description                         |
| ------------- | ------ | ----------------------------------- |
| `id`          | UUID   | Stable identifier                   |
| `name`        | string | e.g. "hallucination", "tool_misuse" |
| `description` | string | What constitutes this failure       |
| `severity`    | enum   | `low`, `medium`, `high`, `critical` |

#### RiskTier (Scenario Context)

| Field      | Type   | Description                             |
| ---------- | ------ | --------------------------------------- |
| `id`       | UUID   | Stable identifier                       |
| `name`     | string | e.g. "safety_critical", "business_high" |
| `weight`   | float  | Numeric weight for scoring (0.0–1.0)    |
| `category` | enum   | `business`, `safety`, `compliance`      |

#### ContextProfile (Scenario Context)

| Field        | Type   | Description                                                   |
| ------------ | ------ | ------------------------------------------------------------- |
| `id`         | UUID   | Stable identifier                                             |
| `name`       | string | e.g. "multi_turn_tool_heavy"                                  |
| `attributes` | object | `{ turn_count, has_tools, languages, context_length_bucket }` |

#### Rubric (Scenario Context)

| Field              | Type     | Description                              |
| ------------------ | -------- | ---------------------------------------- |
| `id`               | UUID     | Stable identifier                        |
| `scenario_type_id` | UUID     | Which scenario this rubric evaluates     |
| `version`          | integer  | Monotonically increasing                 |
| `criteria`         | object[] | `[{ name, description, scale, weight }]` |
| `examples`         | object[] | Positive and negative examples           |

#### Candidate (Candidate Context)

| Field                | Type      | Description                                                     |
| -------------------- | --------- | --------------------------------------------------------------- |
| `id`                 | UUID      | Stable identifier                                               |
| `episode_id`         | UUID      | → Episode.id                                                    |
| `scenario_type_id`   | UUID?     | → ScenarioType.id (null if unmapped)                            |
| `mapping_confidence` | float     | How confident the mapping is (0.0–1.0)                          |
| `state`              | enum      | `raw`, `scored`, `selected`, `labeled`, `validated`, `released` |
| `scores`             | object    | Score vector (see §5.3)                                         |
| `features`           | object    | Derived features (see §5.4)                                     |
| `selection_run_id`   | UUID?     | Which selection run picked this                                 |
| `created_at`         | timestamp |                                                                 |

#### LabelTask (Labeling Context)

| Field            | Type    | Description                                                     |
| ---------------- | ------- | --------------------------------------------------------------- |
| `id`             | UUID    | Stable identifier                                               |
| `candidate_id`   | UUID    | → Candidate.id                                                  |
| `rubric_id`      | UUID    | → Rubric.id                                                     |
| `rubric_version` | integer | Pinned rubric version                                           |
| `assigned_to`    | UUID?   | → Annotator.id                                                  |
| `state`          | enum    | `pending`, `in_progress`, `review`, `adjudication`, `finalized` |
| `pre_label`      | object? | LLM-assisted suggestion                                         |

#### Label (Labeling Context)

| Field           | Type      | Description                                                           |
| --------------- | --------- | --------------------------------------------------------------------- |
| `id`            | UUID      | Stable identifier                                                     |
| `label_task_id` | UUID      | → LabelTask.id                                                        |
| `annotator_id`  | UUID      | → Annotator.id                                                        |
| `label_type`    | enum      | `discrete`, `extractive`, `generative`, `rubric_scored`, `set_valued` |
| `value`         | object    | The annotation content (schema depends on label_type)                 |
| `confidence`    | float     | Annotator's self-reported confidence (0.0–1.0)                        |
| `rationale`     | string?   | Why this label was chosen                                             |
| `created_at`    | timestamp |                                                                       |
| `version`       | integer   | Labels are append-only; edits increment version                       |

#### DatasetSuite (Dataset Context)

| Field         | Type   | Description                          |
| ------------- | ------ | ------------------------------------ |
| `id`          | UUID   | Stable identifier                    |
| `name`        | string | e.g. "Core", "High Risk", "Tool Use" |
| `description` | string | Purpose of this suite                |

#### DatasetVersion (Dataset Context)

| Field                    | Type       | Description                                     |
| ------------------------ | ---------- | ----------------------------------------------- |
| `id`                     | UUID       | Stable identifier                               |
| `suite_id`               | UUID       | → DatasetSuite.id                               |
| `version`                | string     | Semver string                                   |
| `state`                  | enum       | `draft`, `validating`, `released`, `deprecated` |
| `scenario_graph_version` | string     | Pinned graph version                            |
| `selection_policy`       | object     | Parameters used for selection                   |
| `candidate_ids`          | UUID[]     | → Candidate.id[]                                |
| `diagnostics_id`         | UUID       | → DiagnosticsReport.id                          |
| `lineage`                | object     | Full provenance record                          |
| `created_at`             | timestamp  |                                                 |
| `released_at`            | timestamp? |                                                 |

#### Slice (Dataset Context)

| Field                | Type   | Description                            |
| -------------------- | ------ | -------------------------------------- |
| `id`                 | UUID   | Stable identifier                      |
| `dataset_version_id` | UUID   | → DatasetVersion.id                    |
| `name`               | string | e.g. "safety_critical", "multilingual" |
| `filter`             | object | Query expression defining the slice    |
| `candidate_ids`      | UUID[] | Materialized member list               |

### 5.3 Score Vector (Candidate Context)

Each Candidate carries a score vector computed by the Scoring Engine:

| Dimension            | Type  | Description                                             |
| -------------------- | ----- | ------------------------------------------------------- |
| `coverage_gain`      | float | How much selecting this reduces a coverage hole         |
| `risk_weight`        | float | Inherited from RiskTier of mapped scenario              |
| `novelty`            | float | Semantic distance from existing dataset members         |
| `uncertainty`        | float | Model instability / judge disagreement / low confidence |
| `drift_signal`       | float | Is this pattern increasing in frequency?                |
| `failure_likelihood` | float | Predicted probability of model failure                  |
| `cost_estimate`      | float | Expected annotation complexity (proxy for time/cost)    |
| `redundancy_penalty` | float | Similarity to already-selected candidates               |

### 5.4 Feature Set (Candidate Context)

| Feature                  | Type     | Source                                       |
| ------------------------ | -------- | -------------------------------------------- |
| `embedding_request`      | float[]  | Embedding of user request                    |
| `embedding_conversation` | float[]  | Embedding of full conversation summary       |
| `embedding_answer`       | float[]  | Embedding of model response                  |
| `turn_count`             | int      | Derived from episode                         |
| `tool_call_count`        | int      | Derived from trace                           |
| `language`               | string   | Detected language                            |
| `domain_tags`            | string[] | Auto-classified domains                      |
| `latency_ms`             | int      | Response latency                             |
| `has_negative_feedback`  | bool     | User thumbs-down, escalation, or abandonment |
| `retrieval_hit_rate`     | float?   | If retrieval is involved                     |

---

## 6. Phase 1 — Foundation

**Goal:** Establish the data backbone. Episodes flow in, scenarios are defined, datasets are assembled and exported.

**Duration estimate:** 4–6 weeks

### 6.1 What Gets Built

| Component                   | Context   | Description                                                                            |
| --------------------------- | --------- | -------------------------------------------------------------------------------------- |
| Episode schema + storage    | Ingestion | Canonical schema, object store for raw artifacts, OLAP for metadata                    |
| Ingestion API               | Ingestion | `POST /episodes` — accept, validate, redact, store                                     |
| PII redaction pipeline      | Ingestion | Configurable rules, runs before persistence                                            |
| Scenario CRUD + Graph       | Scenario  | API + UI for managing ScenarioTypes, FailureModes, RiskTiers, ContextProfiles, Rubrics |
| Scenario Graph versioning   | Scenario  | Every mutation creates a new immutable graph version                                   |
| Manual Candidate creation   | Candidate | `POST /candidates` — create from episode + manual scenario mapping                     |
| Basic Candidate states      | Candidate | State machine: `raw` → `selected` → `labeled` → `released`                             |
| DatasetSuite + Version CRUD | Dataset   | Create suites, manually add candidates to versions                                     |
| Basic diagnostics           | Dataset   | Redundancy (near-duplicate detection), simple label agreement                          |
| Export pipeline             | Export    | JSONL export, Cobalt format export                                                     |
| Release gates (basic)       | Dataset   | Block release if agreement < threshold                                                 |
| BulkSource schema discovery | Ingestion | DuckDB-powered schema scan for CSV, Parquet, JSONL files                               |
| BulkSource field mapping    | Ingestion | User-defined column → Episode field mapping with validation                            |
| BulkSource batch import     | Ingestion | Batch ingest mapped rows through existing Episode pipeline (dedup, PII, events)        |
| BulkSource preview          | Ingestion | Preview transformed rows before committing to full import                              |

### 6.2 Domain Events Wired

| Event                    | Producer  | Consumer   | Effect                                     |
| ------------------------ | --------- | ---------- | ------------------------------------------ |
| `EpisodeIngested`        | Ingestion | Candidate  | Creates a Candidate in `raw` state         |
| `BulkImportCompleted`    | Ingestion | (internal) | Summary event after batch import completes |
| `LabelFinalized`         | Labeling  | Candidate  | Transitions candidate to `labeled`         |
| `DatasetVersionReleased` | Dataset   | Export     | Triggers default export jobs               |

### 6.3 What Gets Deferred

- Scoring engine (no automated scoring yet — manual selection only)
- Selection engine (no optimization yet)
- Feature store / embeddings
- Adversarial generation
- Drift detection
- Advanced diagnostics

### 6.4 API Endpoints (Phase 1)

**Ingestion**

```
POST   /api/v1/episodes                    # Ingest an episode
GET    /api/v1/episodes/:id                 # Retrieve an episode
GET    /api/v1/episodes                     # List/filter episodes
```

**Bulk Import**

```
POST   /api/v1/bulk-sources                 # Create a bulk source
GET    /api/v1/bulk-sources                 # List bulk sources
GET    /api/v1/bulk-sources/:id             # Get status + progress
POST   /api/v1/bulk-sources/:id/discover    # Discover schema via DuckDB
PUT    /api/v1/bulk-sources/:id/mapping     # Submit field mapping
POST   /api/v1/bulk-sources/:id/preview     # Preview mapped rows
POST   /api/v1/bulk-sources/:id/import      # Start batch import
```

**Scenario**

```
POST   /api/v1/scenario-types              # Create scenario type
GET    /api/v1/scenario-types/:id           # Get scenario type
PUT    /api/v1/scenario-types/:id           # Update scenario type
GET    /api/v1/scenario-types               # List scenario types
GET    /api/v1/scenario-graph               # Get current graph
GET    /api/v1/scenario-graph/versions      # List graph versions
GET    /api/v1/scenario-graph/versions/:v   # Get specific version

POST   /api/v1/failure-modes               # CRUD for failure modes
POST   /api/v1/risk-tiers                  # CRUD for risk tiers
POST   /api/v1/context-profiles            # CRUD for context profiles
POST   /api/v1/rubrics                     # CRUD for rubrics
```

**Candidate**

```
POST   /api/v1/candidates                  # Create candidate (manual)
GET    /api/v1/candidates/:id              # Get candidate
GET    /api/v1/candidates                  # List/filter candidates
PATCH  /api/v1/candidates/:id/state        # Transition state
```

**Labeling**

```
POST   /api/v1/label-tasks                 # Create label task
GET    /api/v1/label-tasks/:id             # Get label task
GET    /api/v1/label-tasks                 # List (filterable by state, assignee)
PATCH  /api/v1/label-tasks/:id/state       # Transition state

POST   /api/v1/labels                      # Submit a label
GET    /api/v1/labels                      # List labels for a task
```

**Dataset**

```
POST   /api/v1/dataset-suites              # Create suite
GET    /api/v1/dataset-suites              # List suites
POST   /api/v1/dataset-versions            # Create version (draft)
GET    /api/v1/dataset-versions/:id        # Get version with diagnostics
PATCH  /api/v1/dataset-versions/:id/state  # Release / deprecate
GET    /api/v1/dataset-versions/:id/diff/:other_id  # Diff two versions
```

**Export**

```
POST   /api/v1/exports                     # Trigger export job
GET    /api/v1/exports/:id                 # Get export status + download URL
```

---

## 7. Phase 2 — Intelligence

**Goal:** Automate candidate scoring and selection. Replace manual "pick what looks interesting" with budgeted optimization.

**Duration estimate:** 6–10 weeks

**Depends on:** Phase 1 complete

### 7.1 What Gets Built

| Component                   | Context            | Description                                                               |
| --------------------------- | ------------------ | ------------------------------------------------------------------------- |
| Embedding pipeline          | Candidate          | Compute and store embeddings for episodes (request, conversation, answer) |
| Feature extraction          | Candidate          | Compute derived features (turn count, tool calls, language, etc.)         |
| Auto scenario mapping       | Candidate          | Classify episodes to ScenarioTypes using embeddings + rules               |
| Scoring Engine              | Candidate          | Compute 8-dimensional score vector per candidate                          |
| Cluster detection           | Candidate          | Find emergent clusters that don't map to known scenarios                  |
| Selection Engine            | Candidate          | Greedy submodular optimizer with budget and constraints                   |
| Label Queue                 | Candidate          | Ordered queue with per-item rationale                                     |
| Pre-labeling (LLM-assisted) | Labeling           | Generate label suggestions before expert review                           |
| Coverage dashboard          | Scenario + Dataset | ScenarioType coverage %, FailureMode coverage %, gap detection            |

### 7.2 Domain Events Added

| Event                     | Producer  | Consumer   | Effect                               |
| ------------------------- | --------- | ---------- | ------------------------------------ |
| `CandidateScored`         | Candidate | (internal) | Candidate ready for selection        |
| `SelectionRunCompleted`   | Candidate | Labeling   | Populates label queue                |
| `UnmappedClusterDetected` | Candidate | Scenario   | Suggests new ScenarioType for review |

### 7.3 Selection Algorithm (Reference)

```
Input:
  - candidates: scored candidate pool
  - budget: max number of items to select
  - constraints: per-scenario minimums, risk tier quotas, freshness requirements
  - existing_dataset: currently released dataset version

Algorithm: Greedy Submodular Maximization
  1. Initialize selected = {}
  2. For each round until |selected| = budget:
     a. For each candidate c not in selected:
        - Compute marginal_gain(c) = weighted sum of:
            coverage_gain(c | selected)     × w_coverage
            risk_weight(c)                  × w_risk
            novelty(c | selected)           × w_novelty
            uncertainty(c)                  × w_uncertainty
            drift_signal(c)                 × w_drift
            failure_likelihood(c)           × w_failure
          minus:
            redundancy_penalty(c | selected) × w_redundancy
            cost_estimate(c)                × w_cost
     b. Select c* = argmax(marginal_gain)
     c. Check constraint satisfaction; skip if adding c* violates a constraint
     d. Add c* to selected
  3. Return selected with rationale per item

Output:
  - Ordered list of candidates with scores and selection rationale
```

### 7.4 API Endpoints Added (Phase 2)

```
POST   /api/v1/scoring/run                 # Trigger scoring run
GET    /api/v1/scoring/runs/:id            # Get scoring run status

POST   /api/v1/selection/run               # Trigger selection with budget + constraints
GET    /api/v1/selection/runs/:id          # Get selection run results
GET    /api/v1/selection/runs/:id/queue    # Get label queue from this run

GET    /api/v1/candidates/:id/scores       # Get score vector
GET    /api/v1/candidates/:id/features     # Get feature set

GET    /api/v1/coverage                    # Coverage report (current dataset vs scenario graph)
GET    /api/v1/coverage/gaps               # Uncovered or under-covered scenarios
```

---

## 8. Phase 3 — Quality & Governance

**Goal:** Make dataset releases trustworthy. Detect drift, enforce quality gates, provide diffs and lineage.

**Duration estimate:** 6–10 weeks

**Depends on:** Phase 2 complete (scoring enables meaningful diagnostics)

### 8.1 What Gets Built

| Component                 | Context             | Description                                                                                                |
| ------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| Advanced diagnostics      | Dataset             | Inter-annotator agreement by slice, label entropy, shortcut detection, leakage checks                      |
| Drift detection           | Candidate + Dataset | Compare production distribution vs dataset distribution                                                    |
| Dataset diffs             | Dataset             | Compute added/removed/changed examples, coverage delta, label changes between versions                     |
| Release gating (advanced) | Dataset             | Configurable policies: agreement thresholds, redundancy limits, drift mismatch, coverage minimums          |
| Lineage explorer          | Dataset             | UI to trace any example back to: source episode, selection run, scoring parameters, labels, rubric version |
| Golden slices             | Dataset             | Lock specific slices for long-term regression comparability                                                |
| Eval result ingestion     | Export (reverse)    | Accept evaluation results from Cobalt/Limestone back into Diamond                                          |
| Failure loop              | Candidate + Dataset | "Which scenarios are still failing after model change?"                                                    |

### 8.2 Diagnostics Report Schema

```json
{
  "dataset_version_id": "uuid",
  "computed_at": "timestamp",
  "metrics": {
    "agreement": {
      "overall_kappa": 0.82,
      "by_scenario": { "scenario_id": 0.75 },
      "by_failure_mode": { "failure_mode_id": 0.68 }
    },
    "redundancy": {
      "index": 0.12,
      "duplicate_pairs": 3
    },
    "coverage": {
      "scenario_coverage_pct": 0.87,
      "failure_mode_coverage_pct": 0.72,
      "risk_tier_coverage": { "safety_critical": 0.95, "business_high": 0.8 }
    },
    "drift": {
      "distribution_divergence": 0.08,
      "stale_scenario_pct": 0.05
    },
    "freshness": {
      "median_episode_age_days": 12,
      "pct_from_last_14_days": 0.35
    }
  },
  "gate_results": [
    {
      "gate": "min_agreement",
      "threshold": 0.7,
      "actual": 0.82,
      "passed": true
    },
    {
      "gate": "max_redundancy",
      "threshold": 0.2,
      "actual": 0.12,
      "passed": true
    },
    { "gate": "min_coverage", "threshold": 0.8, "actual": 0.87, "passed": true }
  ],
  "blocked": false
}
```

### 8.3 API Endpoints Added (Phase 3)

```
GET    /api/v1/dataset-versions/:id/diagnostics     # Full diagnostics report
GET    /api/v1/dataset-versions/:id/lineage          # Lineage graph
GET    /api/v1/dataset-versions/:id/drift            # Drift analysis vs production

POST   /api/v1/release-gates                         # Configure release gate policies
GET    /api/v1/release-gates                          # List gate policies

POST   /api/v1/eval-results                          # Ingest eval results from CI
GET    /api/v1/eval-results                           # List eval results
GET    /api/v1/eval-results/failures                  # Scenarios still failing
```

---

## 9. Phase 4 — Generation & Attribution

**Goal:** Proactively fill coverage gaps with synthetic data. Track ROI per labeled example.

**Duration estimate:** Ongoing

**Depends on:** Phase 2 (coverage gaps known), Phase 3 (drift detection operational)

### 9.1 What Gets Built

| Component                  | Context                     | Description                                                                        |
| -------------------------- | --------------------------- | ---------------------------------------------------------------------------------- |
| Synthetic generator        | Candidate (new sub-service) | Template mutation, adversarial paraphrases, tool perturbations, multi-turn traps   |
| Generator → Candidate pool | Candidate                   | Synthetic episodes enter the same pool as real ones                                |
| Marginal impact tracking   | Dataset + Export            | When eval results come back, attribute score changes to specific dataset additions |
| Cost-aware optimization    | Candidate                   | Fold real annotation costs into the selection optimizer                            |
| ROI dashboard              | Dataset                     | "Expected value per labeled example", impact attribution                           |

### 9.2 Generator Types

| Type                   | Description                                              | Triggers                         |
| ---------------------- | -------------------------------------------------------- | -------------------------------- |
| Template mutation      | Swap entities, constraints, formats in existing episodes | Coverage gaps in known scenarios |
| Adversarial paraphrase | Prompt injection, ambiguity, tricky negations            | Failure mode under-coverage      |
| Tool perturbation      | Partial tool failure, stale retrieval, wrong schema      | Tool-use scenario gaps           |
| Multi-turn trap        | Contradicting user instructions across turns             | Multi-turn context gaps          |
| Judge stress test      | Cases designed to cause judge disagreement/drift         | Limestone calibration needs      |

### 9.3 API Endpoints Added (Phase 4)

```
POST   /api/v1/generators/run              # Trigger synthetic generation
GET    /api/v1/generators/runs/:id         # Get generation run results

GET    /api/v1/impact                       # Impact attribution report
GET    /api/v1/impact/by-example            # Per-example marginal impact
GET    /api/v1/impact/by-scenario           # Per-scenario ROI
```

---

## 10. API Surface (Summary)

All endpoints are prefixed with `/api/v1/`. Authentication via API key in `Authorization: Bearer <key>` header.

| Context               | Base Path                                                                                              | Phase |
| --------------------- | ------------------------------------------------------------------------------------------------------ | ----- |
| Ingestion             | `/episodes`                                                                                            | 1     |
| Ingestion (Bulk)      | `/bulk-sources`                                                                                        | 1     |
| Scenario              | `/scenario-types`, `/failure-modes`, `/risk-tiers`, `/context-profiles`, `/rubrics`, `/scenario-graph` | 1     |
| Candidate             | `/candidates`                                                                                          | 1     |
| Candidate (Scoring)   | `/scoring`, `/candidates/:id/scores`, `/candidates/:id/features`                                       | 2     |
| Candidate (Selection) | `/selection`, `/coverage`                                                                              | 2     |
| Labeling              | `/label-tasks`, `/labels`                                                                              | 1     |
| Dataset               | `/dataset-suites`, `/dataset-versions`                                                                 | 1     |
| Dataset (Quality)     | `/release-gates`, `/eval-results`                                                                      | 3     |
| Export                | `/exports`                                                                                             | 1     |
| Generation            | `/generators`                                                                                          | 4     |
| Impact                | `/impact`                                                                                              | 4     |

---

## 11. Storage Strategy

| Data Type                                   | Store                        | Why                                                        |
| ------------------------------------------- | ---------------------------- | ---------------------------------------------------------- |
| Raw episode artifacts (transcripts, traces) | Object store (S3-compatible) | Immutable, large, append-only                              |
| Episode metadata, candidates, labels        | Relational DB (PostgreSQL)   | Transactional integrity, joins, queries                    |
| Embeddings                                  | PostgreSQL + pgvector        | Simplicity; single DB, good enough for millions of vectors |
| Scenario graph                              | PostgreSQL (adjacency list)  | Versioned, queryable, simple                               |
| Dataset versions + lineage                  | PostgreSQL                   | Relational, versioned                                      |
| Diagnostics reports                         | PostgreSQL (JSONB)           | Semi-structured, queryable                                 |
| Export artifacts                            | Object store (S3-compatible) | Large files, downloadable                                  |

**Principle:** Start with PostgreSQL for everything structured. Only introduce specialized stores (dedicated vector DB, OLAP engine) when PostgreSQL becomes a measurable bottleneck.

---

## 12. Glossary

| Term               | Definition                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| **Episode**        | A normalized production interaction (user messages + model outputs + trace + outcomes)                    |
| **ScenarioType**   | A category of user intent or task family in the taxonomy                                                  |
| **FailureMode**    | A specific way the model can fail (hallucination, refusal error, etc.)                                    |
| **RiskTier**       | A business/safety/compliance risk classification with numeric weight                                      |
| **ContextProfile** | A description of interaction characteristics (turn count, tools, languages)                               |
| **Rubric**         | A versioned evaluation criteria definition for a scenario                                                 |
| **Candidate**      | An episode enriched with scores, features, and scenario mapping — eligible for dataset inclusion          |
| **Score Vector**   | An 8-dimensional assessment of a candidate's value for dataset inclusion                                  |
| **Label**          | An annotation on a candidate, with type, value, confidence, and provenance                                |
| **LabelTask**      | A unit of annotation work assigned to an annotator                                                        |
| **DatasetSuite**   | A named collection of dataset versions (e.g. "Core", "High Risk")                                         |
| **DatasetVersion** | An immutable, released set of labeled candidates with full lineage                                        |
| **Slice**          | A filtered subset of a dataset version (by scenario, risk, time, etc.)                                    |
| **Selection Run**  | A reproducible execution of the optimizer that picks candidates for labeling                              |
| **Coverage**       | The percentage of known scenarios/failure modes represented in a dataset                                  |
| **Drift**          | Divergence between the production data distribution and the dataset distribution                          |
| **Golden Slice**   | A locked subset preserved across versions for long-term regression comparison                             |
| **Lineage**        | The full provenance chain: which episodes, labels, rubrics, and policies produced a dataset               |
| **BulkSource**     | A referenced external dataset (CSV, Parquet, JSONL) with discovered schema and user-defined field mapping |
| **FieldMapping**   | A user-defined mapping from source dataset columns to Diamond Episode fields                              |
| **SourceSchema**   | The auto-discovered column names, types, and sample values from a BulkSource file                         |
