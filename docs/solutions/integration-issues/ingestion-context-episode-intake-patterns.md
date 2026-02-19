---
module: Ingestion
category: integration-issues
date: 2026-02-19
linear_epic: GET-6
---

# Ingestion Context — Episode Intake & Storage Patterns

## Context

6th bounded context implementing episode data ingestion with PII redaction, artifact storage, and event-driven candidate creation.

## Key Patterns

### Anti-Corruption Layer (Connector Registry)

External log formats are normalized via `EpisodeConnector` adapters registered in a `ConnectorRegistry`. The `source` field in the POST body determines which connector processes the payload. Unknown sources return 422 (`ConnectorNotFoundError`).

```typescript
// Adding a new connector:
// 1. Implement EpisodeConnector interface in infrastructure/connectors/
// 2. Register in index.ts: connectorRegistry.register(new MyConnector());
// 3. Callers use source: "my_source_type" in POST body
```

### Deterministic Dedup via Unique Constraint

Rather than UUID v5 (which breaks the UUIDv7 convention), dedup uses a **unique constraint on `(source, source_trace_id)`**. The `source_trace_id` is extracted by the connector from the trace object. Standard `generateId()` is used for the primary key.

### Idempotent Ingestion

Duplicate `(source, source_trace_id)` returns the existing episode with HTTP 200 (not 409). The `episode.ingested` event is NOT re-emitted on duplicates.

### PII Redaction Before Persistence

The `PIIRedactor` port operates on the JSON-serialized string of inputs+outputs+trace+outcomes. The `RegexPIIRedactor` replaces PII with deterministic tokens (`[EMAIL_1]`, `[PHONE_1]`, etc.) and returns a redaction count stored on the episode.

If redaction fails, the entire ingestion is rejected (no partial persistence). `PIIRedactionFailedError` maps to HTTP 502 in the middleware.

### Artifact/DB Compensation

Artifacts are written first, then metadata is persisted. On DB failure, the orphaned artifact is deleted via `ArtifactStore.delete()` before re-throwing.

### User Segment Flattened

`user_segment` fields (`locale`, `plan_tier`, `device`) are stored as top-level columns rather than JSONB. This enables direct SQL filtering without JSON operators.

## Gotchas

- **Connector must be registered for the `source` value** — callers must use `"generic_json"` (or another registered source type), not arbitrary strings
- **`source_trace_id` extraction varies by connector** — GenericJsonConnector tries `trace.id`, then `trace.conversation_id:turn_id`, then falls back to a SHA-256 hash
- **PII regex patterns use global flag** — each `redact()` call creates fresh counters; the regex objects are shared but stateless due to the replacement function approach
- **The `has_negative_feedback` boolean is derived at ingestion time** from the `outcomes` object by checking for keys like `negative_feedback`, `thumbs_down`, etc.

## Files

```
src/contexts/ingestion/
  index.ts                                    # Composition root
  application/
    ports/
      ArtifactStore.ts                        # Object store port
      EpisodeRepository.ts                    # Persistence port
      PIIRedactor.ts                          # Redaction port
    use-cases/
      ManageEpisodes.ts                       # ingest, get, list
  domain/
    entities/Episode.ts                       # EpisodeData interface
    value-objects/UserSegment.ts
    value-objects/EpisodeInput.ts
    errors.ts                                 # EpisodeNotFound, PIIRedactionFailed, ConnectorNotFound
    events.ts                                 # EpisodeIngestedEvent
  infrastructure/
    LocalFilesystemArtifactStore.ts           # Dev artifact store
    DrizzleEpisodeRepository.ts               # PostgreSQL adapter
    RegexPIIRedactor.ts                       # Regex-based PII redaction
    connectors/
      types.ts                                # EpisodeConnector, NormalizedEpisode
      ConnectorRegistry.ts                    # Source→Connector mapping
      GenericJsonConnector.ts                 # Reference connector

src/db/schema/ingestion.ts                    # ig_episodes table
app/api/v1/episodes/route.ts                  # POST + GET list
app/api/v1/episodes/[id]/route.ts             # GET by ID
```
