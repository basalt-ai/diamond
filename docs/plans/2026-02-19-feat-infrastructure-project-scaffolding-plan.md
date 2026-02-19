---
title: "Infrastructure — Project Scaffolding & Cross-cutting Concerns"
type: feat
status: completed
date: 2026-02-19
linear_issue: GET-5
milestone: "Phase 1 — Foundation"
---

# Infrastructure — Project Scaffolding & Cross-cutting Concerns

## Overview

Set up the foundational infrastructure that all six bounded contexts depend on. This epic transforms a bare `create-next-app` scaffold into a production-ready DDD/hexagonal architecture with database, object storage, event bus, authentication, error handling, and shared domain primitives.

**Current state:** Fresh Next.js 16 scaffold with zero infrastructure. No API routes, no database, no auth, no middleware.

**Target state:** A fully operational infrastructure layer where:
- API routes are served at `/api/v1/` with Bearer token authentication
- PostgreSQL is accessible via Drizzle ORM with a working migration pipeline
- Supabase Storage provides S3-compatible object storage
- An in-process event bus enables synchronous cross-context communication
- Standardized error handling and validation wraps all route handlers
- Shared domain primitives (AggregateRoot, value objects, UUID generation) are ready for use

## Problem Statement

Diamond 2.0 is a DDD system with six bounded contexts (Ingestion, Scenario, Candidate, Labeling, Dataset, Export). Every context depends on shared infrastructure: database access, event publishing, error handling, authentication. Without a solid foundation, each context will make incompatible choices, leading to inconsistency and rework.

The PRD specifies hexagonal architecture with ports and adapters per context. This requires infrastructure decisions to be made once, centrally, before any domain logic is written.

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Request Flow                                  │
│                                                                      │
│  HTTP Request                                                        │
│       │                                                              │
│       ▼                                                              │
│  middleware.ts ──── Bearer Token Validation                          │
│       │                                                              │
│       ▼                                                              │
│  app/api/v1/<resource>/route.ts ──── Thin adapter                   │
│       │                                                              │
│       ▼                                                              │
│  withApiMiddleware(handler) ──── Error handling + request ID         │
│       │                                                              │
│       ▼                                                              │
│  Zod validation ──── parseBody / parseQuery                         │
│       │                                                              │
│       ▼                                                              │
│  Use Case (Application Layer)                                        │
│       │                                                              │
│       ├── Domain Layer (Aggregates, Value Objects, Events)           │
│       │                                                              │
│       ├── Repository (Outbound Port → Drizzle adapter)              │
│       │                                                              │
│       └── EventPublisher (Outbound Port → InProcessEventBus)        │
│              │                                                       │
│              ▼                                                       │
│         Synchronous handlers in other contexts                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
diamond/
├── app/
│   ├── api/
│   │   └── v1/
│   │       └── health/
│   │           └── route.ts              # Health check (unauthenticated)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── src/
│   ├── config/
│   │   └── env.ts                        # Zod-validated environment variables
│   ├── contexts/
│   │   └── (empty — ready for bounded contexts)
│   ├── db/
│   │   ├── index.ts                      # Drizzle client singleton
│   │   ├── schema/
│   │   │   └── index.ts                  # Re-exports all context schemas
│   │   └── migrations/                   # Generated SQL migration files
│   ├── lib/
│   │   ├── api/
│   │   │   ├── errors.ts                 # ApiError class + error response type
│   │   │   ├── middleware.ts             # withApiMiddleware HOF
│   │   │   ├── validate.ts              # parseBody / parseQuery helpers
│   │   │   └── response.ts              # Response helpers (paginated, created)
│   │   ├── domain/
│   │   │   ├── AggregateRoot.ts          # Base class with event collection
│   │   │   ├── DomainError.ts            # Base domain exception
│   │   │   ├── Entity.ts                 # Base entity with identity
│   │   │   └── ValueObject.ts            # Base value object with structural equality
│   │   ├── events/
│   │   │   ├── DomainEvent.ts            # Event envelope type
│   │   │   ├── EventPublisher.ts         # Outbound port interface
│   │   │   ├── EventSubscriber.ts        # Subscriber interface
│   │   │   ├── InProcessEventBus.ts      # Phase 1 synchronous adapter
│   │   │   └── registry.ts              # Subscriber wiring (imported at startup)
│   │   └── storage/
│   │       └── supabase-storage.ts       # Supabase Storage S3 client
│   └── shared/
│       ├── types.ts                      # Shared type aliases (UUID, Timestamp)
│       └── ids.ts                        # UUID v7 generation
├── middleware.ts                          # Bearer token auth (project root)
├── drizzle.config.ts                     # Drizzle Kit configuration
├── .env.example                          # Required environment variables
└── tsconfig.json                         # Updated path alias @/* → ./src/*
```

### Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| ORM | Drizzle ORM + `postgres` driver | Type-safe, SQL migrations in git, works directly with Supabase PostgreSQL |
| Object Store | Supabase Storage (SDK + S3 protocol) | Already provisioned, integrated with project |
| Auth (Phase 1) | Static API keys in env vars | Simplest for machine-to-machine; upgrade to DB-backed keys later |
| Event Bus | In-process synchronous, events collected on aggregate | Swappable adapter, zero infra, standard DDD pattern |
| UUID Strategy | UUID v7 (time-ordered) | Better B-tree index performance in PostgreSQL |
| Runtime | Node.js only (not Edge) | Required for `postgres` driver and Drizzle ORM |
| Path Alias | `@/*` → `./src/*` | All source code lives under `src/` |
| Event-Transaction Boundary | Events dispatch **after** repository `save()` commits, outside the transaction | Acknowledged loss risk for Phase 1; transactional outbox deferred to Phase 2+ |
| Migration Strategy | CLI-driven via `drizzle-kit` (not at app boot) | Safer for multi-instance and serverless deployments |
| Schema Organization | One Drizzle schema file per bounded context, all in `public` PostgreSQL schema with naming prefixes | Balanced simplicity vs isolation; e.g. `ingestion_episodes`, `scenario_types` |

### Implementation Phases

#### Phase 1: Core Dependencies & Configuration (Day 1)

Install all required packages, configure TypeScript, set up environment validation.

**Tasks:**
- [x] Install dependencies: `drizzle-orm`, `postgres`, `drizzle-kit`, `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `uuid` (for v7 generation via `uuidv7` package or `crypto.randomUUID` with custom v7)
- [x] Update `tsconfig.json`: change `@/*` path alias to `./src/*`, add `noUncheckedIndexedAccess: true`
- [x] Create `src/config/env.ts` — Zod schema parsing `process.env` at import time

**Files:**
- `package.json` (modified)
- `tsconfig.json` (modified)
- `src/config/env.ts` (new)
- `.env.example` (new)

```typescript
// src/config/env.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  API_KEYS: z.string().min(1).transform(s => s.split(',')),
})

export const env = envSchema.parse(process.env)
```

```
# .env.example
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
API_KEYS=dk_live_key1,dk_live_key2
```

**Success criteria:** `pnpm build` succeeds with updated config. Missing env vars fail fast with clear error messages.

---

#### Phase 2: Database Layer (Day 1-2)

Set up Drizzle ORM, create the database client, and verify migrations work.

**Tasks:**
- [x]Create `drizzle.config.ts` at project root
- [x]Create `src/db/index.ts` — Drizzle client singleton with `postgres` driver
- [x]Create `src/db/schema/index.ts` — empty barrel file for future context schemas
- [x]Add `package.json` scripts: `db:generate`, `db:migrate`, `db:push`, `db:studio`
- [x]Create a minimal test migration (e.g., a `_migrations_test` table) to verify the pipeline works end-to-end
- [x]Verify `pnpm db:generate` and `pnpm db:migrate` execute cleanly against Supabase

**Files:**
- `drizzle.config.ts` (new)
- `src/db/index.ts` (new)
- `src/db/schema/index.ts` (new)
- `package.json` (modified — add scripts)

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const client = postgres(process.env.DATABASE_URL!)
export const db = drizzle(client, { schema })
export type Database = typeof db
```

**Success criteria:** `pnpm db:migrate` runs a migration against Supabase PostgreSQL. `pnpm db:studio` opens Drizzle Studio.

---

#### Phase 3: Shared Domain Primitives (Day 2)

Create the base classes and types that all bounded contexts will use.

**Tasks:**
- [x]Create `src/shared/types.ts` — branded types for UUID, Timestamp
- [x]Create `src/shared/ids.ts` — UUID v7 generation function
- [x]Create `src/lib/domain/AggregateRoot.ts` — base class with domain event collection
- [x]Create `src/lib/domain/Entity.ts` — base entity with identity comparison
- [x]Create `src/lib/domain/ValueObject.ts` — base value object with structural equality
- [x]Create `src/lib/domain/DomainError.ts` — base domain exception hierarchy

**Files:**
- `src/shared/types.ts` (new)
- `src/shared/ids.ts` (new)
- `src/lib/domain/AggregateRoot.ts` (new)
- `src/lib/domain/Entity.ts` (new)
- `src/lib/domain/ValueObject.ts` (new)
- `src/lib/domain/DomainError.ts` (new)

```typescript
// src/lib/domain/AggregateRoot.ts
import { DomainEvent } from '../events/DomainEvent'
import { generateId } from '@/shared/ids'

export abstract class AggregateRoot {
  private _domainEvents: DomainEvent[] = []

  protected addDomainEvent(
    eventType: string,
    aggregateId: string,
    payload: Record<string, unknown>
  ): void {
    this._domainEvents.push({
      eventId: generateId(),
      eventType,
      aggregateId,
      occurredAt: new Date(),
      payload,
    })
  }

  get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents
  }

  clearEvents(): void {
    this._domainEvents = []
  }
}
```

```typescript
// src/lib/domain/DomainError.ts
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message)
    this.name = 'DomainError'
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} not found`, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class InvalidStateTransitionError extends DomainError {
  constructor(entity: string, from: string, to: string) {
    super(
      `Cannot transition ${entity} from ${from} to ${to}`,
      'INVALID_STATE_TRANSITION'
    )
    this.name = 'InvalidStateTransitionError'
  }
}

export class DuplicateError extends DomainError {
  constructor(entity: string, field: string, value: string) {
    super(`${entity} with ${field} "${value}" already exists`, 'DUPLICATE')
    this.name = 'DuplicateError'
  }
}
```

```typescript
// src/lib/domain/ValueObject.ts
export abstract class ValueObject<T extends Record<string, unknown>> {
  protected readonly props: T

  constructor(props: T) {
    this.props = Object.freeze(props)
  }

  equals(other: ValueObject<T>): boolean {
    return JSON.stringify(this.props) === JSON.stringify(other.props)
  }
}
```

**Success criteria:** All base classes compile under strict TypeScript. Domain errors map cleanly to HTTP status codes.

---

#### Phase 4: Event Bus (Day 2-3)

Implement the in-process synchronous event bus with type-safe event definitions.

**Tasks:**
- [x]Create `src/lib/events/DomainEvent.ts` — event envelope interface
- [x]Create `src/lib/events/EventPublisher.ts` — outbound port interface
- [x]Create `src/lib/events/EventSubscriber.ts` — subscriber interface with typed handlers
- [x]Create `src/lib/events/InProcessEventBus.ts` — synchronous adapter implementing both interfaces
- [x]Create `src/lib/events/registry.ts` — handler registration (imported at startup)
- [x]Handle error isolation: if one handler throws, log the error but continue executing remaining handlers

**Files:**
- `src/lib/events/DomainEvent.ts` (new)
- `src/lib/events/EventPublisher.ts` (new)
- `src/lib/events/EventSubscriber.ts` (new)
- `src/lib/events/InProcessEventBus.ts` (new)
- `src/lib/events/registry.ts` (new)

```typescript
// src/lib/events/DomainEvent.ts
export interface DomainEvent {
  readonly eventId: string
  readonly eventType: string
  readonly aggregateId: string
  readonly occurredAt: Date
  readonly payload: Record<string, unknown>
}

export type TypedDomainEvent<
  T extends string,
  P extends Record<string, unknown>
> = DomainEvent & {
  readonly eventType: T
  readonly payload: P
}
```

```typescript
// src/lib/events/EventPublisher.ts
import { DomainEvent } from './DomainEvent'

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>
  publishAll(events: ReadonlyArray<DomainEvent>): Promise<void>
}
```

```typescript
// src/lib/events/InProcessEventBus.ts
import { DomainEvent } from './DomainEvent'
import { EventPublisher } from './EventPublisher'

type EventHandler = (event: DomainEvent) => void | Promise<void>

export class InProcessEventBus implements EventPublisher {
  private handlers = new Map<string, Set<EventHandler>>()

  subscribe(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
    }
    this.handlers.get(eventType)!.add(handler)
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType)
    if (!handlers) return

    for (const handler of handlers) {
      try {
        await handler(event)
      } catch (error) {
        // Log but don't propagate — other handlers still execute
        console.error(
          `[EventBus] Handler failed for ${event.eventType}:`,
          error
        )
      }
    }
  }

  async publishAll(events: ReadonlyArray<DomainEvent>): Promise<void> {
    for (const event of events) {
      await this.publish(event)
    }
  }
}

// Singleton for Phase 1
export const eventBus = new InProcessEventBus()
```

**Design decisions:**
- Handlers are `async` — practically all will make DB calls.
- Error isolation: a failing handler is logged, does not block other handlers or the caller.
- Events dispatch **after** the repository commits (not inside the transaction). The repository's `save()` method calls `eventBus.publishAll(aggregate.domainEvents)` after persisting, then `aggregate.clearEvents()`.
- **Known limitation (Phase 1):** If the process crashes between DB commit and event dispatch, events are lost. A transactional outbox pattern will be added in Phase 2+.

**Success criteria:** Events can be published and handlers are called synchronously. A failing handler does not crash the bus.

---

#### Phase 5: Error Handling & Validation (Day 3)

Implement the standardized API error response contract and Zod validation helpers.

**Tasks:**
- [x]Create `src/lib/api/errors.ts` — `ApiError` class with factory methods, error response type
- [x]Create `src/lib/api/validate.ts` — `parseBody()` and `parseQuery()` helpers using Zod
- [x]Create `src/lib/api/middleware.ts` — `withApiMiddleware()` HOF wrapping route handlers
- [x]Create `src/lib/api/response.ts` — response helpers (paginated list, created)
- [x]Map domain errors to HTTP status codes in the middleware

**Files:**
- `src/lib/api/errors.ts` (new)
- `src/lib/api/validate.ts` (new)
- `src/lib/api/middleware.ts` (new)
- `src/lib/api/response.ts` (new)

**Error response envelope:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request body validation failed",
    "details": {
      "inputs": "Required",
      "model_version": "String must contain at least 1 character(s)"
    },
    "requestId": "01958f1a-..."
  }
}
```

**Domain error → HTTP status mapping:**

| Domain Error | HTTP Status | Error Code |
|---|---|---|
| `NotFoundError` | 404 | `NOT_FOUND` |
| `InvalidStateTransitionError` | 409 | `INVALID_STATE_TRANSITION` |
| `DuplicateError` | 409 | `DUPLICATE` |
| `DomainError` (generic) | 422 | `DOMAIN_ERROR` |
| Zod validation error | 422 | `VALIDATION_ERROR` |
| Unknown error | 500 | `INTERNAL_ERROR` |

```typescript
// src/lib/api/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { ApiError } from './errors'
import { NotFoundError, InvalidStateTransitionError, DuplicateError, DomainError } from '@/lib/domain/DomainError'
import { ZodError } from 'zod'
import { generateId } from '@/shared/ids'

type RouteContext = { params: Promise<Record<string, string>> }
type RouteHandler = (req: NextRequest, ctx: RouteContext) => Promise<Response>

export function withApiMiddleware(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    const requestId = generateId()

    try {
      return await handler(req, ctx)
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json(
          { error: { code: error.code, message: error.message, details: error.details, requestId } },
          { status: error.statusCode }
        )
      }

      if (error instanceof NotFoundError) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: error.message, requestId } },
          { status: 404 }
        )
      }

      if (error instanceof InvalidStateTransitionError || error instanceof DuplicateError) {
        return NextResponse.json(
          { error: { code: error.code, message: error.message, requestId } },
          { status: 409 }
        )
      }

      if (error instanceof DomainError) {
        return NextResponse.json(
          { error: { code: error.code, message: error.message, requestId } },
          { status: 422 }
        )
      }

      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.flatten().fieldErrors, requestId } },
          { status: 422 }
        )
      }

      console.error(`[${requestId}] Unhandled error:`, error)
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', requestId } },
        { status: 500 }
      )
    }
  }
}
```

**Success criteria:** All error types return the standardized envelope. Unknown errors return 500 with no internal details leaked.

---

#### Phase 6: Authentication Middleware (Day 3-4)

Implement Bearer token authentication at the edge.

**Tasks:**
- [x]Create `middleware.ts` at project root — validates `Authorization: Bearer <key>` against `API_KEYS` env var
- [x]Configure matcher to protect `/api/v1/*` routes only
- [x]Exempt health check route: `GET /api/v1/health`
- [x]Return standardized 401 error responses
- [x]Forward truncated key ID as `x-api-key-id` header for audit logging

**Files:**
- `middleware.ts` (new — project root)

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/api/v1/health']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only guard versioned API routes
  if (!pathname.startsWith('/api/v1')) {
    return NextResponse.next()
  }

  // Allow public paths through
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next()
  }

  const authorization = request.headers.get('authorization') ?? ''
  const [scheme, token] = authorization.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Missing or malformed Authorization header' } },
      { status: 401 }
    )
  }

  const validKeys = process.env.API_KEYS?.split(',') ?? []
  if (!validKeys.includes(token)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } },
      { status: 401 }
    )
  }

  const response = NextResponse.next()
  response.headers.set('x-api-key-id', token.slice(0, 8))
  return response
}

export const config = {
  matcher: ['/api/v1/:path*'],
}
```

**Success criteria:** Unauthenticated requests return 401. Valid Bearer tokens pass through. Health check is accessible without auth.

---

#### Phase 7: Supabase Storage (Day 4)

Set up the S3-compatible object store for episode artifacts and export artifacts.

**Tasks:**
- [ ] Install `@aws-sdk/client-s3` and `@aws-sdk/lib-storage` for server-side S3 protocol access (DEFERRED)
- [ ] Create `src/lib/storage/supabase-storage.ts` — storage client using S3 protocol (DEFERRED)
- [ ] Define `ArtifactStore` port interface in `src/lib/storage/ArtifactStore.ts` (DEFERRED)
- [ ] Create Supabase Storage buckets: `ingestion-artifacts`, `export-artifacts` (DEFERRED)
- [ ] Add storage env vars to `.env.example` (DEFERRED)

**Files:**
- `src/lib/storage/ArtifactStore.ts` (new — port interface)
- `src/lib/storage/supabase-storage.ts` (new — adapter)
- `.env.example` (modified)

```typescript
// src/lib/storage/ArtifactStore.ts
export interface ArtifactStore {
  put(key: string, data: Buffer | ReadableStream, contentType: string): Promise<string>
  get(key: string): Promise<Buffer>
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>
  delete(key: string): Promise<void>
}
```

**Bucket structure:**
- `ingestion-artifacts` — raw episode transcripts, traces (private, server-side access only)
- `export-artifacts` — JSONL, Cobalt, Limestone export files (private, accessed via signed URLs)

**Success criteria:** Files can be uploaded and downloaded via the `ArtifactStore` interface. Signed URLs work for time-limited access.

---

#### Phase 8: Health Check & Smoke Test (Day 4)

Create a minimal API route to verify the full stack works end-to-end.

**Tasks:**
- [x]Create `app/api/v1/health/route.ts` — returns 200 with DB connectivity check
- [x]Verify the complete request lifecycle: middleware → route → database → response
- [x]Add `next.config.ts` configuration to force Node.js runtime globally

**Files:**
- `app/api/v1/health/route.ts` (new)
- `next.config.ts` (modified)

```typescript
// app/api/v1/health/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { sql } from 'drizzle-orm'

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`)
    return NextResponse.json({ status: 'healthy', timestamp: new Date().toISOString() })
  } catch {
    return NextResponse.json(
      { status: 'unhealthy', timestamp: new Date().toISOString() },
      { status: 503 }
    )
  }
}
```

**Success criteria:** `GET /api/v1/health` returns 200 with `{ status: "healthy" }`. The app boots and serves routes.

## Alternative Approaches Considered

| Approach | Why Rejected |
|---|---|
| **Supabase client only (no ORM)** | Couples domain logic to Supabase's query API; no type-safe migrations in git; incompatible with hexagonal architecture's outbound port pattern |
| **Prisma instead of Drizzle** | Heavier, generates a client, less control over SQL, slower cold starts in serverless |
| **JWT tokens for Phase 1 auth** | Over-engineered for machine-to-machine API access; adds JWT signing/verification complexity without user identity needs |
| **Edge runtime** | Incompatible with `postgres` driver and Drizzle ORM; Node.js runtime required |
| **Transactional outbox for Phase 1** | Adds significant complexity (outbox table, polling process) for a system with synchronous in-process events; deferred to Phase 2+ when contexts may be deployed separately |
| **One PostgreSQL schema per bounded context** | Drizzle's multi-schema support adds configuration complexity; naming prefixes provide sufficient isolation for Phase 1 |
| **Event sourcing** | Dramatically increases infrastructure complexity; standard CRUD + domain events is sufficient for Diamond's requirements |

## Acceptance Criteria

### Functional Requirements

- [x]App boots and serves API routes at `/api/v1/`
- [x]`GET /api/v1/health` returns `200` with database connectivity check
- [x]Database migrations run cleanly via `pnpm db:migrate`
- [x]`pnpm db:generate` produces SQL migration files from schema changes
- [x]Event bus dispatches events synchronously between registered handlers
- [x]A failing event handler is logged but does not crash the bus or the request
- [x]Auth middleware validates Bearer tokens on all `/api/v1/*` routes (except health)
- [x]Missing/invalid tokens return `401` with standardized error response
- [x]Zod validation failures return `422` with field-level error details
- [x]Domain errors (NotFound, InvalidState, Duplicate) map to correct HTTP status codes
- [x]Unknown errors return `500` with no internal details leaked
- [ ] Files can be uploaded/downloaded via `ArtifactStore` interface to Supabase Storage (DEFERRED)
- [x]Environment variables are validated at boot with clear error messages for missing values

### Non-Functional Requirements

- [x]All code passes `tsc --strict` with no errors
- [x]`noUncheckedIndexedAccess` enabled in tsconfig
- [x]No Supabase credentials or API keys in committed code
- [x]`.env.example` documents all required variables
- [x]Path alias `@/*` resolves to `./src/*`

### Quality Gates

- [x]`pnpm build` succeeds
- [x]`pnpm lint` passes with zero warnings
- [x]All infrastructure code compiles under TypeScript strict mode

## Dependencies & Prerequisites

| Dependency | Status | Notes |
|---|---|---|
| Supabase project | Provisioned | Project ref: `ghatwshamhctyfpoxtyg` |
| Supabase PostgreSQL | Available | Connection string needed in `.env.local` |
| Supabase Storage | Available | Buckets need to be created |
| Supabase credentials | Needed | URL, anon key, service role key from dashboard |
| API keys | Needed | Generate at least one key for development |

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Event loss between DB commit and event dispatch | Medium | Medium | Document as known Phase 1 limitation; add transactional outbox in Phase 2 |
| Supabase connection limits exceeded in development | Low | Medium | Use session pooler (port 5432); limit pool size in Drizzle config |
| Path alias misconfiguration breaks imports | Low | High | Set `@/*` → `./src/*` before writing any source files |
| Next.js Edge runtime accidentally used | Low | High | Set `runtime = 'nodejs'` in `next.config.ts` globally |
| Drizzle ORM version incompatibility with Next.js 16 | Low | Medium | Pin versions; test `pnpm build` early |
| API keys leaked in git | Low | Critical | `.gitignore` includes `.env.local`; only `.env.example` committed |

## ERD — Infrastructure Tables

```mermaid
erDiagram
    %% This is the initial infrastructure schema only.
    %% Domain tables (episodes, candidates, etc.) will be added
    %% by their respective bounded context epics.

    api_keys {
        uuid id PK "UUID v7"
        string key_hash "SHA-256 hash of the key"
        string name "Human-readable name"
        string prefix "First 8 chars for identification"
        boolean is_active "Soft delete / revocation"
        timestamp created_at
        timestamp revoked_at
    }

    %% Note: api_keys table is a FUTURE enhancement.
    %% Phase 1 uses static env var API keys.
    %% This schema is included for forward planning.
```

> **Note:** The `api_keys` table is planned for a future enhancement when key rotation and revocation are needed. Phase 1 uses static environment variable keys.

## Future Considerations

- **Transactional outbox:** When bounded contexts are deployed separately (Phase 2+), replace `InProcessEventBus` with an outbox pattern — events are written to an `outbox_events` table in the same transaction as the aggregate, then a background process dispatches them.
- **API key migration to DB:** Move from env var keys to hashed keys in the `api_keys` table. Supports rotation, revocation, scoping per context, and audit logging.
- **CORS configuration:** When a browser-based admin UI is added, configure CORS headers in `middleware.ts` or `withApiMiddleware`.
- **Rate limiting:** Add per-key rate limiting when the API is exposed to external consumers.
- **Testing infrastructure:** Establish Vitest + test helpers for use case unit tests with in-memory adapter stubs.
- **Local Supabase:** Initialize `supabase/` project for local development with `supabase start`.

## References & Research

### Internal References
- PRD: `PRD.md` — full domain model, bounded contexts, event catalog
- Linear issue: [GET-5](https://linear.app/getbasalt/issue/GET-5/epic-infrastructure-project-scaffolding-and-cross-cutting-concerns)

### External References
- [Building APIs with Next.js (Feb 2025)](https://nextjs.org/blog/building-apis-with-nextjs)
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Next.js Authentication Guide](https://nextjs.org/docs/app/guides/authentication)
- [Drizzle ORM + Supabase Tutorial](https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase)
- [Drizzle Kit CLI Reference](https://orm.drizzle.team/docs/kit-overview)
- [Supabase SSR (Next.js)](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Storage S3 Compatibility](https://supabase.com/docs/guides/storage/s3/compatibility)
- [DDD Domain Events Pattern](https://khalilstemmler.com/articles/typescript-domain-driven-design/chain-business-logic-domain-events/)
