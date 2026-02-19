---
title: Dataset Context — Versioned Suites & Release Gates Implementation Patterns
date: 2026-02-19
category: integration-issues
tags:
  [
    bounded-context,
    ddd,
    state-machine,
    cross-context-integration,
    diagnostics-engine,
    release-gates,
    lineage-tracking,
    drizzle,
  ]
severity: medium
components:
  [
    src/contexts/dataset,
    src/db/schema/dataset.ts,
    app/api/v1/dataset-suites,
    app/api/v1/dataset-versions,
  ]
root_cause: Cross-context adapter method signature mismatches and missing bulk-read ports
resolution_type: implementation-pattern
linear_epic: GET-10
---

# Dataset Context — Versioned Suites & Release Gates Implementation Patterns

Patterns and gotchas from implementing the 4th bounded context (Dataset) in the Diamond DDD architecture. Builds on patterns established by Scenario (1st), Candidate (2nd), and Labeling (3rd) contexts.

## Cross-Context Port Discovery

When building cross-context adapters, you must discover the exact API signatures of other contexts' composition roots. Guessing method names causes runtime errors that TypeScript won't catch (because adapters use lazy `await import()`).

**Wrong:** `manageLabels.listByTask(taskId)` — method doesn't exist.
**Correct:** `manageLabels.listByTaskId(taskId, page, pageSize)` — 3 args required.

**Pattern — always read the source use-case before writing an adapter:**

```typescript
// src/contexts/dataset/infrastructure/LabelContextAdapter.ts
export class LabelContextAdapter implements LabelReader {
  async getLabelsForCandidates(
    candidateIds: UUID[]
  ): Promise<Map<UUID, LabelSummary[]>> {
    const { manageLabelTasks, manageLabels } =
      await import("@/contexts/labeling");
    const result = new Map<UUID, LabelSummary[]>();

    for (const candidateId of candidateIds) {
      try {
        const { data: tasks } = await manageLabelTasks.list(
          { candidateId },
          1,
          100
        );
        for (const task of tasks) {
          const { data: labels } = await manageLabels.listByTaskId(
            task.id,
            1,
            100
          );
          // ... map labels to LabelSummary
        }
      } catch {
        // Skip candidates without labels
      }
    }
    return result;
  }
}
```

## Bulk Operations on Existing Contexts

Existing contexts may only expose single-item operations. When a new context needs bulk reads, extend the adapter with a batching loop rather than modifying the other context.

```typescript
// src/contexts/dataset/infrastructure/CandidateContextAdapter.ts
export class CandidateContextAdapter implements CandidateReader {
  async getMany(candidateIds: UUID[]): Promise<CandidateInfo[]> {
    const { manageCandidates } = await import("@/contexts/candidate");
    const results: CandidateInfo[] = [];
    for (const id of candidateIds) {
      try {
        const candidate = await manageCandidates.get(id);
        results.push({
          id: candidate.id,
          episodeId: candidate.episodeId,
          scenarioTypeId: candidate.scenarioTypeId,
          state: candidate.state,
        });
      } catch {
        // Skip not-found candidates gracefully
      }
    }
    return results;
  }
}
```

**Key insight:** Define both `get(id)` and `getMany(ids)` in port interfaces from the start to prevent n+1 patterns later.

## State Machine with Gate-Driven Auto-Transitions

The DatasetVersion state machine (`draft → validating → released → deprecated`) has a unique pattern: entering `validating` triggers synchronous diagnostics + gate evaluation, which auto-transitions to either `released` or back to `draft`.

```typescript
// src/contexts/dataset/domain/entities/DatasetVersion.ts
const VALID_TRANSITIONS: Record<DatasetVersionState, DatasetVersionState[]> = {
  draft: ["validating"],
  validating: ["released", "draft"],  // Gate-driven: auto-release or rollback
  released: ["deprecated"],
  deprecated: [],
};
```

At the API layer, the PATCH endpoint handles this transparently:

```typescript
// app/api/v1/dataset-versions/[id]/state/route.ts
if (target_state === "validating") {
  await manageDatasetVersions.transition(versionId, "validating");
  const result = await runDiagnostics.execute(versionId);
  return ok(result); // Returns FINAL state (released or draft), not "validating"
}
```

**Key insight:** The API response reflects the final state, not the intermediate `validating` state. A single PATCH can trigger 2 state transitions and multiple domain events.

## Diagnostics Engine Design

`RunDiagnostics` is the most complex use case in this context. It computes metrics, stores reports, evaluates gates, and auto-transitions state — all in one execution.

**Architecture:**

1. Compute redundancy (Jaccard similarity on candidate features)
2. Compute agreement (Cohen's kappa approximation from label pairs)
3. Store diagnostics report in `ds_diagnostics_reports` table
4. Evaluate gates against configurable thresholds (defaults: `min_agreement=0.6`, `max_redundancy=0.1`)
5. Call `aggregate.release()` or `aggregate.rejectToDraft()` based on results
6. Emit `diagnostics.completed` event + aggregate domain events

Gate evaluation merges defaults with suite-level `selectionPolicy` overrides:

```typescript
const gateConfig = {
  ...DEFAULT_GATES,
  ...(typeof data.selectionPolicy === "object" ? data.selectionPolicy : {}),
};
const gateResults = this.evaluateGates(report, gateConfig);
const allPassed = gateResults.every((g) => g.passed);
```

## Version Lineage Building

Each dataset version captures an immutable lineage snapshot at creation time — recording candidate provenance, associated label tasks, and the scenario graph version.

```typescript
// src/contexts/dataset/application/use-cases/ManageDatasetVersions.ts
private async buildLineage(candidates, candidateIds, scenarioGraphVersion, selectionPolicy): Promise<LineageData> {
  const labelsMap = await this.labelReader.getLabelsForCandidates(candidateIds);
  return {
    scenario_graph_version: scenarioGraphVersion,
    selection_policy: selectionPolicy,
    candidate_count: candidates.length,
    candidates: candidates.map((c) => ({
      candidate_id: c.id,
      episode_id: c.episodeId,
      label_task_ids: [...new Set((labelsMap.get(c.id) ?? []).map((l) => l.labelTaskId))],
      scenario_type_id: c.scenarioTypeId ?? undefined,
    })),
    captured_at: new Date().toISOString(),
  };
}
```

**Key insight:** Lineage is stored as JSONB, enabling reproducibility even if source contexts evolve later.

## Version Diff Computation

Diffs between two versions compute added, removed, and unchanged candidate sets:

```typescript
// src/contexts/dataset/application/use-cases/ComputeVersionDiff.ts
const setA = new Set(versionA.candidateIds as string[]);
const setB = new Set(versionB.candidateIds as string[]);
return {
  added: [...setB].filter((id) => !setA.has(id)),
  removed: [...setA].filter((id) => !setB.has(id)),
  unchanged: [...setA].filter((id) => setB.has(id)),
};
```

## Gotchas

| Issue | Wrong | Correct |
| --- | --- | --- |
| LabelReader method name | `manageLabels.listByTask(taskId)` | `manageLabels.listByTaskId(taskId, page, pageSize)` |
| Bulk reads on single-entity contexts | Add bulk to existing context | Wrap in adapter loop with error handling |
| State endpoint response for `validating` | Return `{ state: "validating" }` | Return final state after diagnostics |
| DATABASE_URL loading | `source .env.local` in bash | Pass `DATABASE_URL=...` directly or use explicit env loader |
| Diagnostics with no labels | Cohen's kappa = NaN | Default to `1.0` when `sampleCount === 0` |

## Prevention Strategies

1. **Read composition root source before writing adapters** — Never guess method names. Open the target context's `index.ts` and the underlying use-case to verify exact method signatures and argument counts.

2. **Define bulk-read ports from the start** — When creating repository port interfaces, include both `get(id)` and `getMany(ids)` upfront. This prevents n+1 adapter patterns in consuming contexts.

3. **Document auto-transition sequences** — If a use case triggers multiple state transitions, add a JSDoc comment documenting the sequence and all possible final states.

4. **Test gate evaluation edge cases** — Empty candidate lists, single candidates, all-pass, all-fail, and mixed results. Verify no NaN or division-by-zero in metrics.

5. **Use explicit DATABASE_URL for drizzle-kit** — Don't rely on shell `source` for `.env.local`. Pass the URL directly or use a dedicated env loader.

## Cross-References

- [Bounded Context DDD Implementation Patterns](./bounded-context-ddd-implementation-patterns.md) — directory structure, request flow, error mapping
- [Candidate Context DDD Implementation Patterns](./candidate-context-ddd-implementation-patterns.md) — class-based aggregates, state machines, cross-context integration
- [Labeling Context Annotation Workflow Patterns](./labeling-context-annotation-workflow-patterns.md) — convenience state machine methods, agreement calculation, label versioning
- [Next.js 16 Infrastructure Scaffolding Gotchas](./nextjs16-infrastructure-scaffolding-gotchas.md) — Zod v4, proxy.ts, postgres.js
- [Dataset Context Plan](../../plans/2026-02-19-feat-dataset-context-versioned-suites-release-gates-plan.md) — full implementation plan with ERD and state diagrams
