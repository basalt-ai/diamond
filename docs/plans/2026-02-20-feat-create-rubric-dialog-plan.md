---
title: Add Create Rubric Dialog to Scenario Type Detail Page
type: feat
status: active
date: 2026-02-20
---

# Add Create Rubric Dialog to Scenario Type Detail Page

## Overview

Add a "Create Rubric" button and dialog to the scenario type detail page (`/scenarios/[id]`). The dialog lets users define rubric criteria and optional examples, then POSTs to `/api/v1/rubrics`. On success, the `rubric.version_created` event fires and auto-creates label tasks for selected candidates.

## Problem Statement

The scenario type detail page already displays rubrics in an "Effective Rubrics" table, but there's no way to create one from the UI. Users must use `curl` or other API tools. This blocks the end-to-end annotation workflow from being fully UI-driven.

## Proposed Solution

Add a "Create Rubric" button next to the "Effective Rubrics" heading that opens a dialog with:

- Dynamic list of criteria (name, description, weight)
- Optional list of examples (input, expectedOutput, explanation)
- Submit → POST `/api/v1/rubrics` → table refresh + toast

Follow the existing create dialog pattern from `app/(dashboard)/scenarios/page.tsx`.

## Technical Approach

### File Changes

**1. Fix existing `Rubric` interface and columns** — `app/(dashboard)/scenarios/[id]/page.tsx`

The current page defines a `Rubric` interface with phantom `name`/`description` fields that don't exist on the domain model. Fix to match `RubricData`:

```ts
interface Rubric {
  id: string;
  scenarioTypeId: string;
  version: number;
  criteria: Array<{ name: string; description: string; weight: number }>;
  examples: Array<{
    input: string;
    expectedOutput: string;
    explanation: string;
  }>;
  createdAt: string;
}
```

Update `rubricColumns` to display version, criteria count, and created date instead of the broken name/description accessors.

**2. Add dialog state and mutation** — same file

- `useState(false)` for `dialogOpen`
- `useState` for `criteria` array (initialize with one empty row)
- `useState` for `examples` array (initialize empty)
- `useMutation("POST", "/rubrics", { onSuccess, onError })`
- Destructure `refetch` from the rubrics `useApi` call

**3. Add "Create Rubric" button** — same file

Place next to the "Effective Rubrics" heading:

```tsx
<div className="flex items-center justify-between">
  <h2 className="text-sm font-semibold">Effective Rubrics</h2>
  <Button size="sm" onClick={() => setDialogOpen(true)}>
    <PlusIcon className="size-4" />
    Create Rubric
  </Button>
</div>
```

**4. Add dialog component** — same file (inline, following existing pattern)

Dialog structure:

- **Criteria section**: Dynamic list with "Add Criterion" button. Each row has: name (Input), description (Textarea), weight (Input type="number" step="0.01" min="0" max="1"). Remove button per row (disabled when only 1 criterion remains).
- **Examples section** (optional): Collapsible or always-visible. "Add Example" button. Each row: input (Textarea), expectedOutput (Textarea), explanation (Textarea). Remove button per row.
- **Footer**: Cancel + "Create Rubric" submit button (disabled while `isPending`)

**5. Form submission handler**

```ts
function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  mutate({
    scenarioTypeId: params.id,
    criteria: criteria.map((c) => ({
      name: c.name,
      description: c.description,
      weight: parseFloat(c.weight),
    })),
    examples: examples.length > 0 ? examples : undefined,
  });
}
```

**6. New imports needed**

```ts
import { PlusIcon, TrashIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
```

### API Contract

**POST `/api/v1/rubrics`** (already exists):

```json
{
  "scenarioTypeId": "uuid",
  "criteria": [
    {
      "name": "string (min 1)",
      "description": "string",
      "weight": "number (0-1)"
    }
  ],
  "examples": [
    { "input": "string", "expectedOutput": "string", "explanation": "string" }
  ]
}
```

- `criteria` min 1 item required
- `examples` optional (omit or empty array)
- `weight` per criterion: 0.0–1.0, independent (no sum constraint)
- Response: 201 with `RubricData` including auto-incremented `version`

### Behavioral Decisions

| Decision                       | Choice                             | Rationale                                |
| ------------------------------ | ---------------------------------- | ---------------------------------------- |
| Initial form state             | 1 empty criterion row              | Guides user; avoids blank form confusion |
| Weight sum validation          | None                               | Backend treats weights independently     |
| Dialog close on dirty form     | No confirmation; reset immediately | Matches existing pattern; simpler        |
| Post-submit behavior           | Auto-close + toast + refetch table | Matches create scenario type pattern     |
| Example fields when row exists | All 3 required                     | Prevents incomplete data                 |
| Max criteria/examples          | No limit                           | Backend has no limit; trust user         |
| Criterion name uniqueness      | Not enforced                       | Backend doesn't enforce it               |

## Acceptance Criteria

- [ ] "Create Rubric" button visible next to "Effective Rubrics" heading
- [ ] Dialog opens with one empty criterion row (name, description, weight fields)
- [ ] User can add/remove criterion rows (minimum 1 enforced)
- [ ] User can add/remove optional example rows (input, expectedOutput, explanation)
- [ ] Submit disabled while request is in-flight
- [ ] On success: dialog closes, toast shown, rubrics table refreshes with new entry
- [ ] On API error: toast.error with message, dialog stays open
- [ ] Existing rubric table columns fixed to show version, criteria count, created date
- [ ] Form resets when dialog is closed and reopened

## Edge Cases

- Submit with weight outside 0-1 → API returns 400, shown as toast error
- Submit with empty criterion name → API returns 400, shown as toast error
- Network failure → toast error, dialog stays open for retry
- Concurrent creation → backend handles version auto-increment atomically; both succeed with different versions
- Event handler failure on `rubric.version_created` → synchronous event bus propagates error; user sees 500; rubric not created (transaction rolls back)

## References

- Existing create dialog pattern: `app/(dashboard)/scenarios/page.tsx`
- Rubric API route: `app/api/v1/rubrics/route.ts`
- Rubric domain model: `src/contexts/scenario/domain/entities/Rubric.ts`
- Detail page: `app/(dashboard)/scenarios/[id]/page.tsx`
- Event handler: `src/contexts/candidate/application/handlers/onLabelTaskFinalized.ts`
