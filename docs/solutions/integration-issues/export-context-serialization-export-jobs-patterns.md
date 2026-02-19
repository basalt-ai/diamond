---
title: Export Context — Serialization & Export Jobs Implementation Patterns
date: 2026-02-19
category: integration-issues
tags:
  [
    bounded-context,
    ddd,
    state-machine,
    export-context,
    serialization,
    jsonl,
    artifact-storage,
    cross-context-adapters,
    event-driven,
    drizzle,
  ]
severity: medium
components: [src/contexts/export, src/db/schema/export.ts, app/api/v1/exports]
root_cause: ExportMetadata type incompatibility with Record<string, unknown> and migration generation including all tables
resolution_type: implementation-pattern
linear_epic: GET-11
---

# Export Context — Serialization & Export Jobs Implementation Patterns

Patterns and gotchas from implementing the 5th bounded context (Export) in the Diamond DDD architecture. Builds on patterns established by Scenario (1st), Candidate (2nd), Labeling (3rd), and Dataset (4th) contexts.

This context serializes released dataset versions into JSONL files for evaluation runners and CI systems. It owns 1 database table (`ex_` prefix), 1 aggregate root, 6 port interfaces, 3 cross-context adapters, and 3 API endpoints.

## 1. FormatSerializer Port — Extensible Serialization

The `FormatSerializer` port allows adding new output formats (CSV, Parquet) without modifying the use case. The composition root passes a serializer map keyed by format enum:

```typescript
// src/contexts/export/application/ports/FormatSerializer.ts
export interface FormatSerializer {
  format: ExportFormat;
  fileExtension: string;
  serialize(metadata: ExportMetadata, rows: ExportRow[]): Buffer;
}

// src/contexts/export/index.ts — composition root wires serializers by format key
export const manageExports = new ManageExports(
  exportJobRepo,
  datasetVersionReader,
  candidateDataReader,
  labelDataReader,
  artifactStore,
  { jsonl: jsonlSerializer }
);
```

The use case selects the serializer at runtime:

```typescript
// src/contexts/export/application/use-cases/ManageExports.ts
const serializer = this.serializers[input.format];
const content = serializer.serialize(metadata, rows);
```

To add CSV: implement `FormatSerializer`, add `"csv"` to `EXPORT_FORMATS`, register in the composition root. No use-case changes needed.

## 2. JSONL Row Schema — Metadata Header + Data Rows

The JSONL format uses a first-line metadata header pattern. Line 1 is a `_meta` object; subsequent lines are data rows.

```typescript
// src/contexts/export/infrastructure/JsonlSerializer.ts
export class JsonlSerializer implements FormatSerializer {
  readonly format: ExportFormat = "jsonl";
  readonly fileExtension = "jsonl";

  serialize(metadata: ExportMetadata, rows: ExportRow[]): Buffer {
    const lines = [
      JSON.stringify({ _meta: metadata }),
      ...rows.map((row) => JSON.stringify(row)),
    ];
    return Buffer.from(lines.join("\n") + "\n", "utf-8");
  }
}
```

The metadata header includes lineage provenance for reproducibility:

```typescript
// src/contexts/export/application/use-cases/ManageExports.ts
const lineageHash = version.lineage
  ? `sha256:${createHash("sha256").update(JSON.stringify(version.lineage)).digest("hex")}`
  : "sha256:none";

const metadata: ExportMetadata = {
  version: version.version,
  suite_id: version.suiteId,
  scenario_graph_version: version.scenarioGraphVersion,
  candidate_count: rows.length,
  lineage_hash: lineageHash,
  exported_at: new Date().toISOString(),
  format: input.format,
  gate_results_summary: {
    all_passed: gateResults.every(
      (g) => (g as Record<string, unknown>).passed === true
    ),
    gates: gateResults.length,
  },
};
```

Candidates are sorted by ID before serialization for deterministic output:

```typescript
const sortedCandidateIds = [...candidateIds].sort();
```

## 3. ArtifactStore Port — Storage Abstraction

The `ArtifactStore` port abstracts artifact persistence. MVP uses local filesystem under `.exports/`; future: S3.

```typescript
// src/contexts/export/application/ports/ArtifactStore.ts
export interface ArtifactStore {
  write(path: string, content: Buffer): Promise<{ sizeBytes: number }>;
  readStream(path: string): ReadableStream;
  exists(path: string): Promise<boolean>;
  delete(path: string): Promise<void>;
}
```

The local implementation creates nested directories on demand:

```typescript
// src/contexts/export/infrastructure/LocalFilesystemArtifactStore.ts
const ARTIFACT_ROOT = join(process.cwd(), ".exports");

export class LocalFilesystemArtifactStore implements ArtifactStore {
  async write(path: string, content: Buffer): Promise<{ sizeBytes: number }> {
    const fullPath = join(ARTIFACT_ROOT, path);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content);
    const stats = await stat(fullPath);
    return { sizeBytes: stats.size };
  }

  readStream(path: string): ReadableStream {
    const fullPath = join(ARTIFACT_ROOT, path);
    return new ReadableStream({
      async start(controller) {
        const data = await readFile(fullPath);
        controller.enqueue(data);
        controller.close();
      },
    });
  }
}
```

Artifact paths follow the convention `{datasetVersionId}/{jobId}.{extension}`, producing paths like `abcd-1234/.../export-id.jsonl`.

## 4. Deduplication via Unique Constraint + Failed Job Cleanup

The `ex_export_jobs` table has a unique constraint on `(dataset_version_id, format)`:

```typescript
// src/db/schema/export.ts
(t) => [
  unique("ex_export_jobs_version_format_uniq").on(t.datasetVersionId, t.format),
];
```

The use case enforces idempotency by checking for existing non-failed exports before creating:

```typescript
// src/contexts/export/application/use-cases/ManageExports.ts
const existing = await this.repo.findByVersionAndFormat(
  versionId,
  input.format
);
if (existing && existing.state !== "failed") {
  throw new DuplicateError(
    "ExportJob",
    "dataset_version_id+format",
    `${versionId}+${input.format}`
  );
}

// If a failed export exists, delete it before creating a new one
if (existing && existing.state === "failed") {
  await this.repo.delete(existing.id);
}
```

This means: one successful export per version+format. Failed exports are automatically cleaned up on retry.

## 5. Idempotent Event Handler for Auto-Export

The `onDatasetVersionReleased` handler auto-triggers JSONL export when a version is released. It catches `DuplicateError` and `NotFoundError` for idempotency:

```typescript
// src/contexts/export/application/handlers/onDatasetVersionReleased.ts
export async function onDatasetVersionReleased(
  event: DomainEvent
): Promise<void> {
  const { dataset_version_id } = event.payload as {
    dataset_version_id: string;
  };
  try {
    const { manageExports } = await import("@/contexts/export");
    await manageExports.create({
      dataset_version_id: dataset_version_id as UUID as string,
      format: "jsonl",
    });
  } catch (error) {
    if (error instanceof DuplicateError) return;
    if (error instanceof NotFoundError) return;
    throw error;
  }
}
```

Registered in the event bus:

```typescript
// src/lib/events/registry.ts
eventBus.subscribe("dataset_version.released", onDatasetVersionReleased);
```

Since the event bus is synchronous, the export runs inline within the Dataset context's release flow. This is a known MVP limitation for large datasets.

## 6. State Machine — Synchronous Inline Processing

The ExportJob state machine is simpler than other contexts: `pending -> processing -> completed | failed`. Processing runs synchronously within `create()`:

```typescript
// src/contexts/export/domain/entities/ExportJob.ts
const VALID_TRANSITIONS: Record<ExportJobState, ExportJobState[]> = {
  pending: ["processing"],
  processing: ["completed", "failed"],
  completed: [],
  failed: [],
};
```

The `complete()` method combines artifact data assignment with state transition and event emission:

```typescript
complete(artifact: {
  path: string;
  sizeBytes: number;
  checksum: string;
  rowCount: number;
  metadata: Record<string, unknown>;
}): void {
  this.transitionTo("completed");
  this._artifactPath = artifact.path;
  this._artifactSizeBytes = artifact.sizeBytes;
  this._artifactChecksum = artifact.checksum;
  this._rowCount = artifact.rowCount;
  this._metadata = artifact.metadata;
  this._completedAt = new Date();

  this.addDomainEvent("export.completed", {
    export_job_id: this.id,
    dataset_version_id: this._datasetVersionId,
    format: this._format,
    artifact_path: artifact.path,
    row_count: artifact.rowCount,
    checksum: artifact.checksum,
  });
}
```

## 7. Streaming Download Endpoint

The download endpoint streams the artifact file with proper MIME type and disposition headers, returning a raw `Response` instead of the standard JSON envelope:

```typescript
// app/api/v1/exports/[id]/download/route.ts
export const GET = withApiMiddleware(async (_req, ctx) => {
  const { id } = await ctx.params;
  const { stream, filename, contentType } =
    await manageExports.getArtifactStream(id as UUID);
  return new Response(stream, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
```

The use case maps JSONL format to `application/x-ndjson` content type:

```typescript
const contentType =
  job.format === "jsonl" ? "application/x-ndjson" : "application/octet-stream";
```

## 8. Export-Specific Port Interfaces — Narrow Read Views

Each cross-context port exposes only the fields needed for export, not the full domain model:

```typescript
// src/contexts/export/application/ports/CandidateDataReader.ts
export interface CandidateExportView {
  id: UUID;
  episodeId: string;
  scenarioTypeId: string | null;
}

// src/contexts/export/application/ports/LabelDataReader.ts
export interface LabelExportView {
  candidateId: UUID;
  labelTaskId: UUID;
  annotatorId: string;
  value: Record<string, unknown>;
}

// src/contexts/export/application/ports/DatasetVersionReader.ts
export interface DatasetVersionExportView {
  id: UUID;
  suiteId: UUID;
  version: string;
  state: string;
  scenarioGraphVersion: string;
  candidateIds: string[];
  lineage: Record<string, unknown> | null;
  gateResults: Record<string, unknown>[] | null;
  releasedAt: Date | null;
}
```

This keeps the Export context decoupled from upstream domain model changes. If the Candidate entity adds fields, only the adapter mapping changes, not the port interface.

## Gotchas

| Issue                                     | Wrong                                           | Correct                                                     |
| ----------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------- |
| ExportMetadata vs Record<string, unknown> | Pass `metadata` directly to `job.complete()`    | Cast: `metadata as unknown as Record<string, unknown>`      |
| First `db:generate` after `db:push`       | Run `pnpm db:generate` (includes ALL tables)    | Apply export table SQL via psql, delete generated migration |
| Route params (Next.js 16)                 | `params.id`                                     | `const { id } = await params`                               |
| Download endpoint response                | Return via `ok()` / `created()` helpers         | Return raw `new Response(stream, { headers })`              |
| Event handler idempotency                 | Let DuplicateError propagate (breaks event bus) | Catch DuplicateError and NotFoundError, return silently     |
| N+1 cross-context reads                   | Assume bulk APIs exist on other contexts        | Loop per-candidate with try/catch (acceptable for MVP)      |

## Prevention Strategies

1. **Cast structured metadata types explicitly** — When a typed interface (like `ExportMetadata`) does not satisfy `Record<string, unknown>` due to strict index signature checking, use `as unknown as Record<string, unknown>` at the boundary where it enters the generic field.

2. **Manage migrations carefully after `db:push`** — If you used `db:push` during development, the first `db:generate` will include every table. Either apply the new table SQL directly via psql or manually edit the generated migration to only include the new table.

3. **Catch domain errors in event handlers** — Event handlers that call other contexts' use cases must catch expected domain errors (`DuplicateError`, `NotFoundError`) to prevent the synchronous event bus from propagating failures back to the originating context.

4. **Define narrow read-view interfaces per context** — Export ports should expose only the fields needed for serialization, not mirror the full upstream domain. This minimizes coupling and makes adapter changes localized.

5. **Sort output for determinism** — Any serialization that consumers might diff or checksum should produce deterministic output. Sort candidates by ID before serialization.

## Cross-References

- [Bounded Context DDD Implementation Patterns](./bounded-context-ddd-implementation-patterns.md) — directory structure, request flow, error mapping
- [Candidate Context DDD Implementation Patterns](./candidate-context-ddd-implementation-patterns.md) — class-based aggregates, state machines, cross-context integration
- [Labeling Context Annotation Workflow Patterns](./labeling-context-annotation-workflow-patterns.md) — label versioning, agreement calculation, cross-context adapters
- [Dataset Context Versioned Suites & Release Gates Patterns](./dataset-context-versioned-suites-release-gates-patterns.md) — version lineage, diagnostics engine, gate evaluation
- [Next.js 16 Infrastructure Scaffolding Gotchas](./nextjs16-infrastructure-scaffolding-gotchas.md) — Zod v4, proxy.ts, postgres.js
