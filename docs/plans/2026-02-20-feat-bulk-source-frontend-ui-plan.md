---
title: "Frontend UI for BulkSource Import Wizard"
type: feat
status: active
date: 2026-02-20
context: ingestion
milestone: Universal Dataset Sink (BulkSource)
---

# Frontend UI for BulkSource Import Wizard

## Overview

Build the frontend for the BulkSource/DuckDB connector feature. This includes a list page at `/bulk-sources` and a state-driven detail page at `/bulk-sources/[id]` that acts as a multi-step import wizard. The backend (7 API endpoints) is already complete.

This is the primary onboarding path for Diamond — users bring their data, Diamond normalizes it.

## Problem Statement

The BulkSource backend is fully functional but has no UI. Users currently have no way to:

- Browse and manage their bulk imports
- Discover the schema of a dataset file
- Map discovered columns to Episode fields
- Preview the transformation before committing
- Monitor import progress in real-time

## Technical Approach

### Architecture

Follow existing Diamond frontend conventions:

- All pages are `"use client"` components under `app/(dashboard)/`
- Data fetching via `useApi` hook, mutations via `useMutation` hook
- API client at `src/lib/api-client.ts` (base: `/api/v1`)
- shadcn/ui components with amber theme, zero border-radius, dark mode only
- `Field/FieldGroup/FieldLabel/FieldError` for forms, manual `useState` per field
- `DataTable + Pagination` for list pages
- `StateBadge` for status display
- `toast` from sonner for success/error feedback

### State-Driven Detail Page

The detail page renders different content based on the BulkSource's `status` field. This follows the pattern established by the Export detail page (state-dependent card rendering) rather than introducing a standalone wizard component.

```
┌─────────────────────────────────────────────────────┐
│ ← Back    Bulk Source: {name}    [status badge]     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Step indicator: pending → discovered → mapped     │
│   → importing → completed]                          │
│                                                     │
│  ┌─ State-dependent content ──────────────────────┐ │
│  │                                                │ │
│  │  pending:     Info card + "Discover" button    │ │
│  │  discovered:  Schema table + Mapping form      │ │
│  │  mapped:      Preview table + "Import" button  │ │
│  │  importing:   Progress bar + stats + polling   │ │
│  │  completed:   Summary card + stats             │ │
│  │  comp_w_err:  Summary + error log + retry      │ │
│  │  failed:      Error card + retry button        │ │
│  │                                                │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  ┌─ Details card (always visible) ────────────────┐ │
│  │  ID, URI, Format, Source Label, Created, ...   │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### New Files

```
app/(dashboard)/bulk-sources/
├── page.tsx                          # List page
└── [id]/
    └── page.tsx                      # Detail/wizard page

src/components/bulk-source/
├── step-indicator.tsx                # Visual step progress (pending→completed)
├── schema-table.tsx                  # Discovered columns with types + samples
├── mapping-form.tsx                  # Column → Episode field mapping form
├── preview-table.tsx                 # Preview transformed rows
├── import-progress.tsx               # Progress bar + stats during import
└── error-log-table.tsx               # Row-level error log display

src/components/app-shell/sidebar.tsx  # (modify) Add "Imports" nav entry
```

### Implementation Phases

#### Phase 1: List Page + Navigation

Add sidebar navigation entry and build the list page.

**Files:**

- `src/components/app-shell/sidebar.tsx` — add "Imports" item with `DatabaseIcon`
- `app/(dashboard)/bulk-sources/page.tsx` — list page with DataTable

**List page columns:**
| Column | Source | Notes |
|--------|--------|-------|
| Name | `name` | Truncate at 40 chars |
| URI | `uri` | Truncate, show as monospace |
| Format | `format` | Badge (CSV, PARQUET, JSONL) or "—" if pending |
| Status | `status` | StateBadge component |
| Rows | `rowCount` | Formatted number or "—" |
| Created | `createdAt` | Relative date |

**Features:**

- Status filter via button group (All, Active, Completed, Failed)
  - "All" = no filter
  - "Active" = pending, discovered, mapped, importing
  - "Completed" = completed, completed_with_errors
  - "Failed" = failed
- URL-driven pagination (page, page_size)
- "New Import" button opens create dialog
- Row click navigates to detail page
- EmptyState when no sources exist

**Create dialog:**

- Fields: Name (required), URI (required, with placeholder showing format examples), Source Label (hidden behind "Advanced" toggle, shows default `bulk:{id}`)
- Submit calls `POST /bulk-sources`, then navigates to `/bulk-sources/{id}`

#### Phase 2: Detail Page Shell + Pending/Discovered States

Build the detail page skeleton and the first two states.

**Files:**

- `app/(dashboard)/bulk-sources/[id]/page.tsx` — main detail page
- `src/components/bulk-source/step-indicator.tsx` — step progress indicator
- `src/components/bulk-source/schema-table.tsx` — discovered schema display

**Step indicator:**
A horizontal sequence of labeled steps with active/completed/upcoming styling:
`Create → Discover → Map → Preview → Import`
Highlight the current step based on status. Steps before current show a checkmark.

**Pending state content:**

- Info card showing URI and format hint
- "Discover Schema" button (primary)
- Loading spinner overlay during discovery (can take up to 10s)
- On success: page refetches, status changes to `discovered`
- On error: toast with SchemaDiscoveryError message, button stays enabled for retry

**Discovered state content:**

- Schema table showing all columns from `discoveredSchema`:
  - Column: name (monospace)
  - Type: DuckDB type as badge (VARCHAR, INTEGER, TIMESTAMP, BOOLEAN, JSON, etc.)
  - Nullable: check/cross icon
  - Samples: first 3 sample values, truncated
- Row count display
- File checksum display
- "Re-discover" button (secondary, for when file was updated)
- Mapping form (see Phase 3)

**Details card (always visible):**

- ID (monospace, truncated)
- URI (monospace, full)
- Format
- Source Label
- File Checksum
- Created / Updated timestamps

#### Phase 3: Mapping Form

The most complex component. Build the column-to-field mapping interface.

**Files:**

- `src/components/bulk-source/mapping-form.tsx`

**Layout: Section-based form**

The form has sections for each Episode field. Each section shows a multi-select or single-select dropdown populated with the discovered columns.

```
┌─ Required Fields ───────────────────────────────────┐
│                                                     │
│  Inputs *          [user_message ✕] [system_prompt ✕]│
│  (select columns)  ▾ Add column...                  │
│                                                     │
│  Outputs *         [assistant_reply ✕]              │
│  (select columns)  ▾ Add column...                  │
│                                                     │
├─ Identity ──────────────────────────────────────────┤
│                                                     │
│  Trace ID          ▾ conversation_id                │
│  (dedup key)       (fallback: row content hash)     │
│                                                     │
├─ Optional Fields ───────────────────────────────────┤
│                                                     │
│  Trace             ▾ Add columns...                 │
│  Outcomes          ▾ Add columns...                 │
│  Occurred At       ▾ Select column (TIMESTAMP hint) │
│  Model Version     ▾ Select column                  │
│  Locale            ▾ Select column                  │
│  Plan Tier         ▾ Select column                  │
│  Device            ▾ Select column                  │
│  Scenario Type ID  ▾ Select column                  │
│  Has Negative FB   ▾ Select column (BOOLEAN hint)   │
│  Metadata          ▾ Add columns...                 │
│                                                     │
├─ Unmapped Columns ──────────────────────────────────┤
│  session_id, request_id, internal_score (ignored)   │
└─────────────────────────────────────────────────────┘
│ [Cancel]                        [Save Mapping]      │
```

**Dropdown options show:** column name + type badge + first sample value

- Example: `user_message  VARCHAR  "How do I..."`

**Validation:**

- At least one column for `inputs` and `outputs` (client-side)
- Referenced columns must exist in schema (guaranteed by dropdown)
- Show warning (not error) if a column appears in multiple mappings
- Submit calls `PUT /bulk-sources/:id/mapping`

**Column search:** For datasets with many columns (50+), add a search/filter input at the top of each dropdown.

**Unmapped columns section:** Shows columns not assigned to any field, as informational (these will be ignored during import).

#### Phase 4: Preview + Import

**Files:**

- `src/components/bulk-source/preview-table.tsx`

**Mapped state content:**

- "Edit Mapping" button (secondary) to go back to mapping form
- Preview card:
  - Auto-loads preview on entering mapped state (calls `POST /preview` with limit=5)
  - Shows transformed rows in a table:
    - Columns: source, source_trace_id, inputs (JSON), outputs (JSON), trace, outcomes, occurred_at, metadata
    - JsonViewer for complex fields (collapsed by default)
  - "Show more rows" option (re-fetches with higher limit, max 20)
  - Loading skeleton while fetching
  - Error toast if preview fails
- "Start Import" button (primary, prominent)
  - Click opens confirmation dialog:
    - "Import {rowCount} rows from {name}?"
    - "This will create Episodes through the standard pipeline (dedup, PII redaction, artifacts). This action cannot be cancelled."
    - [Cancel] [Start Import]
  - On confirm: calls `POST /bulk-sources/:id/import` with batch_size
  - On 202: page refetches, transitions to `importing` state
  - On 409: toast "Import already in progress", refetch

#### Phase 5: Import Progress + Terminal States

**Files:**

- `src/components/bulk-source/import-progress.tsx`
- `src/components/bulk-source/error-log-table.tsx`

**Importing state content:**

- Progress card:
  - Progress bar: `processed / total * 100`
  - Stats row: `{processed} of {total} processed • {succeeded} succeeded • {failed} failed • {deduplicated} skipped`
  - Started at timestamp
  - Auto-refresh: poll `GET /bulk-sources/:id` every 2 seconds
  - **No auto-stop** while status is `importing` (unlike exports which cap at 30s)
  - Manual "Refresh" button as fallback
  - Disable all action buttons during import

**Completed state content:**

- Success card with green accent
- Summary: "{succeeded} episodes created, {deduplicated} duplicates skipped"
- "Preview Mapping" button (read-only preview for inspection)
- Details card shows completed_at timestamp

**Completed with errors state content:**

- Warning card with amber accent
- Summary: "{succeeded} succeeded, {failed} failed, {deduplicated} skipped"
- Error log table:
  - Columns: Row #, Error, Column (if present), Value (if present, truncated)
  - Show first 20 rows, expandable to show all
  - Banner: "Showing first 1000 errors" if error_log has 1000 entries
- "Re-import" button transitions to `mapped` state (shows mapping form + import flow)

**Failed state content:**

- Error card with red accent
- Error message from error_log (usually a single fatal error)
- "Re-import" button transitions to `mapped` state
- "Re-discover" affordance if the error suggests file access issues

## Acceptance Criteria

### Functional Requirements

- [ ] Sidebar shows "Imports" navigation item linking to `/bulk-sources`
- [ ] List page shows all bulk sources with status filter and pagination
- [ ] Create dialog creates a new BulkSource and navigates to detail page
- [ ] Detail page shows correct content for each of the 7 statuses
- [ ] Step indicator reflects current position in the workflow
- [ ] "Discover Schema" triggers discovery and shows loading state
- [ ] Discovered schema displays columns with types, nullability, and samples
- [ ] Mapping form allows assigning columns to all Episode fields
- [ ] Mapping form validates required fields (inputs, outputs) client-side
- [ ] Mapping form shows column type + sample value in dropdowns
- [ ] Preview shows transformed rows after mapping is submitted
- [ ] Import confirmation dialog shows row count and irreversibility warning
- [ ] Import progress polls every 2 seconds with live-updating stats
- [ ] Completed state shows success summary
- [ ] Completed with errors shows error log table
- [ ] Failed state shows error and re-import option
- [ ] "Re-import" from error states transitions back to mapped state
- [ ] All API errors display via toast notifications

### Non-Functional Requirements

- [ ] Mapping form is usable with 100+ columns (search/filter in dropdowns)
- [ ] Import progress polling does not stop until status changes from `importing`
- [ ] Page loads in under 1 second for bulk sources with large schemas
- [ ] No unnecessary re-renders during polling (only progress card updates)

## Dependencies & Risks

| Risk                                                 | Mitigation                                              |
| ---------------------------------------------------- | ------------------------------------------------------- |
| Mapping form complexity for many columns             | Add search filter to dropdowns, limit visible options   |
| Import polling duration for large files              | Continuous polling while importing, no auto-stop        |
| Discovery errors not persisted on entity             | Show error via toast, keep Discover button enabled      |
| Optimistic lock conflicts (409) on concurrent access | Show toast "Data changed, refreshing...", auto-refetch  |
| DuckDB column types unfamiliar to users              | Show sample values alongside types in mapping dropdowns |

## References

### Internal References

- Existing list page pattern: `app/(dashboard)/episodes/page.tsx`
- Existing detail page pattern: `app/(dashboard)/exports/[id]/page.tsx` (state-dependent rendering + polling)
- Existing form pattern: `app/(dashboard)/episodes/ingest/page.tsx`
- DataTable component: `src/components/data-table/data-table.tsx`
- StateBadge component: `src/components/state-badge.tsx`
- API hooks: `src/hooks/use-api.ts`, `src/hooks/use-mutation.ts`
- Backend plan: `docs/plans/2026-02-19-feat-universal-dataset-sink-bulk-source-plan.md`
- BulkSource domain model: `src/contexts/ingestion/domain/entities/BulkSource.ts`
- BulkSource use case: `src/contexts/ingestion/application/use-cases/ManageBulkSources.ts`
- API routes: `app/api/v1/bulk-sources/`

### Institutional Learnings

- Next.js 16: `await ctx.params` for route params (`docs/solutions/integration-issues/nextjs16-infrastructure-scaffolding-gotchas.md`)
- Zod v4: `import { z } from "zod"`, `.nonnegative()`, `z.record(z.string(), z.unknown())`
- Polling pattern: 2s interval with `setInterval` + `refetch` from exports detail page
- Error mapping: 404 = not found, 409 = conflict/stale, 422 = validation/domain
