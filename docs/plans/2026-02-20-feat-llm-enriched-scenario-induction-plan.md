---
title: "feat: LLM-enriched scenario induction with failure modes and context profiles"
type: feat
status: completed
date: 2026-02-20
---

# LLM-Enriched Scenario Induction

## Overview

Extend the scenario induction pipeline so auto-induced scenario types are fully hydrated with failure modes, context profiles, and the correct risk tier — not just a name and description. The LLM already analyzes episode traces; we expand its output to also suggest failure modes and context attributes, then wire those to the scenario type via existing join tables.

## Problem Statement

Currently, `InduceScenarios` creates scenario types with only:

- `name` (from LLM)
- `description` (from LLM)
- `riskTierId` (hardcoded to "business" — ignores `suggestedRiskCategory`)
- `needsReview: true`
- No failure modes, no context profiles, no rubrics

The Scenario Types, Failure Modes, Risk Tiers, and Context Profiles pages in the UI are disconnected — the induction pipeline populates only the first.

## Proposed Solution

Three changes, each independently shippable:

1. **Expand LLM schema** — `ClusterSummary` gains `suggestedFailureModes` and `suggestedContextProfile`
2. **Expand ScenarioTypeCreator port** — accept `failureModeIds[]` and `contextProfileIds[]`, plus methods to find-or-create failure modes and context profiles
3. **Wire InduceScenarios** — use `suggestedRiskCategory` for real risk tier lookup, resolve/create failure modes and context profiles, pass IDs to scenario type creation

## Technical Approach

### Phase 1: Expand LLM Response Schema

**Files:**

- `src/contexts/intelligence/application/ports/ClusterSummarizer.ts` (edit)
- `src/contexts/intelligence/infrastructure/LlmClusterSummarizer.ts` (edit)

**Tasks:**

- [x]Expand `ClusterSummary` interface:
  ```typescript
  export interface ClusterSummary {
    suggestedName: string;
    suggestedDescription: string;
    suggestedRiskCategory: "business" | "safety" | "compliance";
    suggestedFailureModes: Array<{
      name: string;
      description: string;
      severity: "low" | "medium" | "high" | "critical";
    }>;
    suggestedContextProfile: {
      name: string;
      attributes: Record<string, string>;
    } | null;
  }
  ```
- [x]Update Zod `summarySchema` in `LlmClusterSummarizer` to match
- [x]Update LLM system/user prompts to request failure modes and context profile:
  - System: "Also identify common failure modes (what goes wrong) and the context profile (environment dimensions like user type, device, locale)"
  - User: expand JSON request to include `suggestedFailureModes` array and `suggestedContextProfile` object
- [x]Update `FALLBACK_SUMMARY` to include empty failure modes and null context profile
- [x]Increase `max_tokens` from 300 to 600 to accommodate larger response

**Acceptance criteria:**

- [x]LLM returns failure modes with name, description, severity
- [x]LLM returns context profile with name and attribute key-value pairs
- [x]Fallback still works when LLM fails (empty arrays, null profile)

---

### Phase 2: Expand ScenarioTypeCreator Port + Adapter

**Files:**

- `src/contexts/intelligence/application/ports/ScenarioTypeCreator.ts` (edit)
- `src/contexts/intelligence/infrastructure/adapters/ScenarioContextAdapter.ts` (edit)

**Tasks:**

- [x]Add methods to `ScenarioTypeCreator` port:
  ```typescript
  export interface ScenarioTypeCreator {
    create(input: {
      name: string;
      description: string;
      riskTierId: UUID;
      needsReview: boolean;
      failureModeIds?: UUID[];
      contextProfileIds?: UUID[];
    }): Promise<{ id: UUID }>;
    findRiskTierByCategory(
      category: "business" | "safety" | "compliance"
    ): Promise<{ id: UUID; name: string } | null>;
    findOrCreateFailureMode(input: {
      name: string;
      description: string;
      severity: "low" | "medium" | "high" | "critical";
    }): Promise<{ id: UUID }>;
    findOrCreateContextProfile(input: {
      name: string;
      attributes: Record<string, unknown>;
    }): Promise<{ id: UUID }>;
  }
  ```
- [x]Implement `findOrCreateFailureMode` in `ScenarioContextAdapter`:
  - Lazy import `manageFailureModes` from Scenario context
  - Call `manageFailureModes.list()`, search for exact name match (case-insensitive)
  - If found → return existing ID
  - If not found → call `manageFailureModes.create()` → return new ID
- [x]Implement `findOrCreateContextProfile` in `ScenarioContextAdapter`:
  - Same pattern: list, match by name, create if missing
- [x]Update `create()` to pass `failureModeIds` and `contextProfileIds` through to `manageScenarioTypes.create()`

**Acceptance criteria:**

- [x]`findOrCreateFailureMode` is idempotent — calling twice with same name returns same ID
- [x]`findOrCreateContextProfile` is idempotent
- [x]Scenario type creation passes through failure mode and context profile IDs to join tables
- [x]All cross-context reads via lazy import (no circular deps)

---

### Phase 3: Wire InduceScenarios to Use Enriched Data

**Files:**

- `src/contexts/intelligence/application/use-cases/InduceScenarios.ts` (edit)
- `src/contexts/intelligence/domain/entities/ClusteringRun.ts` (edit — expand `ClusterData`)

**Tasks:**

- [x]Expand `ClusterData` value object to carry LLM enrichment:
  ```typescript
  export interface ClusterData {
    // ... existing fields ...
    suggestedRiskCategory: "business" | "safety" | "compliance" | null;
    suggestedFailureModes: Array<{
      name: string;
      description: string;
      severity: "low" | "medium" | "high" | "critical";
    }>;
    suggestedContextProfile: {
      name: string;
      attributes: Record<string, string>;
    } | null;
  }
  ```
- [x]Add columns to `in_clusters` table:
  - `suggested_risk_category varchar(20)` — nullable
  - `suggested_failure_modes jsonb` — default `[]`
  - `suggested_context_profile jsonb` — nullable
- [x]Update `DrizzleClusteringRunRepository` to persist/load new fields
- [x]Update `ManageClusteringRuns.create()` to populate new fields from `ClusterSummary`
- [x]Update `InduceScenarios.execute()` for new scenario creation path:
  1. Use `cluster.suggestedRiskCategory` → `findRiskTierByCategory(category)` instead of hardcoded "business"
  2. For each `cluster.suggestedFailureModes` entry → `findOrCreateFailureMode()` → collect IDs
  3. If `cluster.suggestedContextProfile` exists → `findOrCreateContextProfile()` → collect ID
  4. Pass `failureModeIds` and `contextProfileIds` to `scenarioTypeCreator.create()`

**Acceptance criteria:**

- [x]Induced scenarios have the correct risk tier (safety/compliance/business) based on LLM analysis
- [x]Induced scenarios have failure modes wired via join table
- [x]Induced scenarios have context profile wired via join table
- [x]Failure Modes and Context Profiles pages in UI show the auto-created entries
- [x]Reused scenarios (centroid match) don't create duplicate failure modes
- [x]Manual curation still works — humans can edit/add/remove failure modes and profiles on `needsReview` scenarios

## Acceptance Criteria

### Functional

- [x]`POST /api/v1/clustering/runs` produces scenarios with failure modes and context profiles
- [x]Failure Modes page shows auto-created entries
- [x]Context Profiles page shows auto-created entries
- [x]Risk Tiers page shows correct tier assignment (not all "business")
- [x]Scenario detail page shows wired failure modes and context profiles
- [x]Duplicate failure mode names are reused, not duplicated
- [x]Manual edit of induced scenarios still works in UI

### Non-Functional

- [x]LLM call stays under 2s (increased token budget is fine)
- [x]Fallback produces valid scenarios even without failure modes/profiles
- [x]All new fields have DB defaults so existing data isn't broken

## References

### Files to modify

- `src/contexts/intelligence/application/ports/ClusterSummarizer.ts`
- `src/contexts/intelligence/infrastructure/LlmClusterSummarizer.ts`
- `src/contexts/intelligence/application/ports/ScenarioTypeCreator.ts`
- `src/contexts/intelligence/infrastructure/adapters/ScenarioContextAdapter.ts`
- `src/contexts/intelligence/application/use-cases/InduceScenarios.ts`
- `src/contexts/intelligence/application/use-cases/ManageClusteringRuns.ts`
- `src/contexts/intelligence/domain/entities/ClusteringRun.ts`
- `src/contexts/intelligence/infrastructure/DrizzleClusteringRunRepository.ts`
- `src/db/schema/intelligence.ts`

### Existing patterns used

- `ManageFailureModes.create()` — `src/contexts/scenario/application/use-cases/ManageFailureModes.ts`
- `ManageContextProfiles.create()` — `src/contexts/scenario/application/use-cases/ManageContextProfiles.ts`
- `CreateScenarioTypeInput` accepts `failureModeIds[]` and `contextProfileIds[]`
- Lazy import adapter pattern from `src/contexts/intelligence/infrastructure/adapters/`
