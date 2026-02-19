---
title: "feat: Implement ArtifactStore outbound port for Ingestion context"
type: feat
status: completed
date: 2026-02-19
epic: GET-6
milestone: "Phase 1 — Foundation"
context: ingestion
---

# Implement ArtifactStore Outbound Port for Ingestion Context

## Overview

The GET-6 epic (Ingestion Context — Episode Intake & Storage) defines 4 outbound ports: `EpisodeRepository`, `ArtifactStore`, `PIIRedactor`, `EventPublisher`. All have dedicated Linear issues except `ArtifactStore`. This issue fills that gap.

The `ArtifactStore` stores raw episode artifacts (conversation transcripts, traces, tool call logs) immutably. A local filesystem adapter enables development without requiring S3 (deferred to GET-14).

## Problem Statement / Motivation

GET-22 (POST /api/v1/episodes) depends on an `ArtifactStore` port to persist raw artifacts before saving metadata to PostgreSQL. Without this port defined and implemented, the ingestion flow cannot be completed. GET-14 (S3 adapter) also depends on the port interface existing first.

The Export context already has a canonical `ArtifactStore` implementation (`src/contexts/export/application/ports/ArtifactStore.ts`). The Ingestion context needs its own port following DDD bounded-context isolation, with the same interface shape.

## Proposed Solution

Define an `ArtifactStore` port interface in the Ingestion context's application layer, and implement a `LocalFilesystemArtifactStore` adapter in the infrastructure layer. Follow the exact patterns established by the Export context.

### Key Design Decisions

**1. Context-specific port (not shared in `src/lib/storage/`)**

Each bounded context owns its ports per DDD conventions. The Export and Ingestion `ArtifactStore` interfaces will be identical in shape but independently defined. This matches how `CandidateReader` exists independently in both Labeling and Dataset contexts.

Rationale: A shared interface in `src/lib/storage/` would couple two bounded contexts to a single contract. If Ingestion later needs metadata (e.g., content-type) on write, it can evolve independently.

When GET-14 introduces S3, the S3 adapter can implement both interfaces (or a shared adapter can be introduced at that point with confidence about the actual needs).

**2. Keep `delete()` on the interface**

Even though ingestion artifacts are logically immutable, `delete()` is needed for:

- GDPR right-to-erasure compliance
- Cleanup of orphaned artifacts from failed ingestions
- Storage management

Immutability is enforced at the use-case level (check `exists()` before `write()`), not at the port level.

**3. `Buffer`-based writes (matching Export pattern)**

Use `Buffer` for write content, consistent with the Export context. Episode artifacts (JSON transcripts, traces) are typically <10MB. Streaming writes can be added in GET-14 if needed for large artifacts.

**4. Path convention: `episodes/{episodeId}.json`**

Flat path structure with episode ID as filename. Simple, predictable, and sufficient for Phase 1. The `artifact_uri` stored in episode metadata is this logical path, not a resolvable URL.

**5. Local storage root: `.ingestion/`**

Following the Export context's `.exports/` convention. Directory is `.gitignore`d.

## Technical Considerations

### Architecture

The port sits in the standard location per project conventions:

```
src/contexts/ingestion/
  application/
    ports/
      ArtifactStore.ts          # Port interface (NEW)
  infrastructure/
    LocalFilesystemArtifactStore.ts  # Dev adapter (NEW)
```

The Ingestion context directory structure does not exist yet. This issue creates the minimal directory scaffolding needed for the port, but the full context setup (domain models, repository, use cases, API routes) is handled by other GET-6 sub-issues (GET-19 through GET-26).

### Error Handling

The `LocalFilesystemArtifactStore.readStream()` should handle `ENOENT` errors gracefully instead of letting them propagate as cryptic stream errors. This improves on the Export context's current implementation.

### Integration Points

- **GET-22** (POST /api/v1/episodes): will inject `ArtifactStore` into the ingestion use case via constructor
- **GET-14** (S3 adapter): will implement this port interface with an S3-compatible backend
- **GET-19** (Episode domain model): `artifact_uri` field stores the logical path used by this port
- **Composition root** (`src/contexts/ingestion/index.ts`): wires `LocalFilesystemArtifactStore` as the default adapter

## Acceptance Criteria

- [x] Port interface defined at `src/contexts/ingestion/application/ports/ArtifactStore.ts`
- [x] `LocalFilesystemArtifactStore` implemented at `src/contexts/ingestion/infrastructure/LocalFilesystemArtifactStore.ts`
- [x] `write(path, content)` creates nested directories and returns `{ sizeBytes }`
- [x] `readStream(path)` returns a `ReadableStream` with proper error handling for missing files
- [x] `exists(path)` returns boolean for path existence check
- [x] `delete(path)` removes artifact at path (no-op if missing)
- [x] Local storage root is `.ingestion/` (relative to project root)
- [x] `.ingestion/` added to `.gitignore`
- [x] Minimal ingestion context directory structure created (application/ports/, infrastructure/)

## MVP

### `src/contexts/ingestion/application/ports/ArtifactStore.ts`

```typescript
export interface ArtifactStore {
  write(path: string, content: Buffer): Promise<{ sizeBytes: number }>;
  readStream(path: string): ReadableStream;
  exists(path: string): Promise<boolean>;
  delete(path: string): Promise<void>;
}
```

### `src/contexts/ingestion/infrastructure/LocalFilesystemArtifactStore.ts`

```typescript
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { ArtifactStore } from "../application/ports/ArtifactStore";

const ARTIFACT_ROOT = join(process.cwd(), ".ingestion");

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
        try {
          const data = await readFile(fullPath);
          controller.enqueue(data);
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
  }

  async exists(path: string): Promise<boolean> {
    const fullPath = join(ARTIFACT_ROOT, path);
    return existsSync(fullPath);
  }

  async delete(path: string): Promise<void> {
    const fullPath = join(ARTIFACT_ROOT, path);
    await rm(fullPath, { force: true });
  }
}
```

### `.gitignore` addition

```
.ingestion/
```

## Dependencies & Risks

**Dependencies:**

- None — this is a leaf issue with no upstream dependencies
- Downstream: GET-22 depends on this port existing

**Risks:**

- **Low**: Interface may need minor evolution when GET-14 (S3 adapter) is implemented. Mitigated by following the proven Export pattern exactly.
- **Low**: Path convention becomes a storage contract. Mitigated by keeping it simple (`episodes/{id}.json`) and documenting it.

## References & Research

### Internal References

- Export ArtifactStore port: `src/contexts/export/application/ports/ArtifactStore.ts:1`
- Export LocalFilesystemArtifactStore: `src/contexts/export/infrastructure/LocalFilesystemArtifactStore.ts:9`
- Export composition root wiring: `src/contexts/export/index.ts:15`
- Canonical directory structure: `docs/solutions/integration-issues/bounded-context-ddd-implementation-patterns.md`
- Export context patterns: `docs/solutions/integration-issues/export-context-serialization-export-jobs-patterns.md`

### Related Issues

- GET-6: [Epic] Ingestion Context — Episode Intake & Storage (parent epic)
- GET-14: Configure S3-compatible object store adapter (depends on this port)
- GET-19: Define Episode domain model and value objects (defines `artifact_uri` field)
- GET-22: Implement POST /api/v1/episodes (first consumer of this port)
