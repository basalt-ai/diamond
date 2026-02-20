---
title: "fix: Validate UUID params in dynamic API routes to prevent 500 errors"
type: fix
status: completed
date: 2026-02-20
---

# Validate UUID Params in Dynamic API Routes

## Overview

Requests to `/api/v1/scenario-types/graph` and `/api/v1/scenario-types/graph/effective-rubrics` produce 500 errors because the `[id]` dynamic route accepts any string, passes it directly to a Drizzle query expecting a UUID, and the resulting DB error is unhandled — falling through to the generic 500 catch-all in `withApiMiddleware`.

## Problem Statement

The `[id]` route handlers cast `params.id` directly to `UUID` without validation:

```typescript
// app/api/v1/scenario-types/[id]/route.ts
const { id } = await ctx.params;
const result = await manageScenarioTypes.get(id as UUID); // "graph" is not a UUID
```

When `id = "graph"` (or any non-UUID string), Drizzle sends it to PostgreSQL which fails with a type mismatch. The error isn't a `NotFoundError` — it's a raw query error, so `withApiMiddleware` logs it as an unhandled 500.

This affects **every `[id]` route in the entire API** (30+ routes), not just scenario-types.

## Proposed Solution

Add a `parseUUID` helper that validates UUID format and throws a 400 `ApiError` for invalid values. Apply it in `withApiMiddleware` or as a shared utility used at the route level.

**Approach: Centralized validation in `withApiMiddleware`** — catch Drizzle/pg query errors caused by invalid UUID input and return 400. This is fragile and couples to DB error messages.

**Approach: Route-level `parseUUID` helper (recommended)** — a small utility that validates UUID format and throws an `ApiError(400)`. Each `[id]` route calls it explicitly. This is explicit, simple, and matches the existing `parseBody`/`parseQuery` pattern.

## Technical Approach

### Phase 1: Add `parseUUID` Helper

**Files:**

- `src/lib/api/params.ts` (create)

**Tasks:**

- [x] Create `parseUUID(value: string, paramName?: string): UUID` that:
  - Validates against UUID v4/v7 regex pattern
  - Returns the value cast as `UUID` if valid
  - Throws `ApiError(400, "INVALID_PARAM", ...)` if invalid
- [x] Export a convenience `parseParams` that extracts and validates named UUID params from the route context

### Phase 2: Apply to Scenario-Types Routes (Fix the Immediate Bug)

**Files:**

- `app/api/v1/scenario-types/[id]/route.ts` (edit)
- `app/api/v1/scenario-types/[id]/effective-rubrics/route.ts` (edit)

**Tasks:**

- [x] Replace `id as UUID` with `parseUUID(id)` in both route files
- [x] Verify requests with `id = "graph"` return 400 instead of 500

### Phase 3: Apply to All Other `[id]` Routes

**Files:** all `app/api/v1/**/[id]/**/route.ts` and similar dynamic routes

**Tasks:**

- [x] Find all routes that do `as UUID` on a route param
- [x] Replace each with `parseUUID()` call
- [x] Spot-check a few routes to confirm 400 behavior

## Acceptance Criteria

### Functional

- [x] `GET /api/v1/scenario-types/graph` returns 400 with `INVALID_PARAM` error
- [x] `GET /api/v1/scenario-types/graph/effective-rubrics` returns 400
- [x] `GET /api/v1/scenario-types/<valid-uuid>` still returns 200 or 404 as before
- [x] All other `[id]` routes validate UUID params

### Non-Functional

- [x] No 500 log spam from invalid UUID params
- [x] Zero breaking changes for valid requests

## References

### Files to modify

- `src/lib/api/params.ts` (new)
- `src/lib/api/middleware.ts` (reference — error handling context)
- `app/api/v1/scenario-types/[id]/route.ts`
- `app/api/v1/scenario-types/[id]/effective-rubrics/route.ts`
- All other `app/api/v1/**/[id|param]/**/route.ts` files

### Existing patterns used

- `parseBody(req, schema)` — `src/lib/api/parse.ts` (Zod body validation)
- `parseQuery(req, schema)` — `src/lib/api/parse.ts` (Zod query validation)
- `ApiError` — `src/lib/api/errors.ts` (typed HTTP errors caught by middleware)
