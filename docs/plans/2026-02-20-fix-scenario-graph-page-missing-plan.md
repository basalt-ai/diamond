---
title: "fix: Create missing scenario graph visualization page"
type: fix
status: completed
date: 2026-02-20
---

# fix: Create missing scenario graph visualization page

## Overview

The sidebar links to `/scenarios/graph` but the page file doesn't exist (`app/(dashboard)/scenarios/graph/page.tsx`). The backend has 104 graph versions with rich data (23 scenario types, risk tiers, failure modes, context profiles). The fix is to create the missing page that fetches from `GET /api/v1/scenario-graph` and renders the taxonomy as a collapsible tree with summary charts.

## Problem Statement

The sidebar navigation already includes a "Graph" link (`src/components/app-shell/sidebar.tsx:51`) pointing to `/scenarios/graph`, but navigating there shows a 404. Meanwhile, the `/scenarios` page only shows a flat paginated list from `/scenario-types` — it never uses the graph API. Users cannot visualize the scenario taxonomy hierarchy or see how scenario types relate to their risk tiers, failure modes, and context profiles.

## Proposed Solution

Create a new page with two sections:

1. **Summary charts** (top) — using shadcn/ui Chart component (Recharts):
   - **Radar chart**: per-scenario-type coverage profile across dimensions (failure modes count, context profiles count, rubrics count, risk weight)
   - **Radial bar chart**: distribution of scenario types by risk tier category (safety, business, compliance, etc.)

2. **Collapsible tree** (below) — the taxonomy hierarchy built from `parentId` references

3. **Version selector + changelog** — switch between graph versions and see what changed

## Technical Approach

### Setup

Install shadcn chart component and recharts dependency:

```bash
pnpm dlx shadcn@latest add chart
```

This adds `recharts` as a dependency and creates `src/components/ui/chart.tsx`.

### New File

**`app/(dashboard)/scenarios/graph/page.tsx`** — single file, following established page patterns:

- `"use client"` directive
- Inner `GraphContent()` component with all logic
- Default export wraps in `<Suspense>`

### Data Flow

```
useApi("/scenario-graph")  →  GraphSnapshot  →  buildTree() + buildChartData()  →  render
useApi("/scenario-graph/versions?limit=20")  →  version selector dropdown
```

### Charts

#### Radar Chart — Scenario Type Coverage

Shows how well-covered each scenario type is across dimensions. Data shape:

```typescript
// One entry per scenario type (or top N by some metric)
const radarData = scenarioTypes.map((st) => ({
  name: st.name,
  failureModes: st.failureModes.length,
  contextProfiles: st.contextProfiles.length,
  rubrics: st.rubricIds.length,
  riskWeight: st.riskTier.weight,
}));
```

Uses: `RadarChart`, `Radar`, `PolarGrid`, `PolarAngleAxis`, `PolarRadiusAxis` from recharts, wrapped in `ChartContainer`.

#### Radial Bar Chart — Risk Tier Distribution

Shows how scenario types are distributed across risk tier categories:

```typescript
// Aggregate by risk tier category
const radialData = Object.entries(
  groupBy(scenarioTypes, (st) => st.riskTier.category)
).map(([category, types]) => ({
  category,
  count: types.length,
  fill: `var(--color-${category})`,
}));
```

Uses: `RadialBarChart`, `RadialBar`, `PolarAngleAxis` from recharts, wrapped in `ChartContainer`.

### Tree Building (client-side)

```typescript
type TreeNode = ScenarioType & { children: TreeNode[] };

function buildTree(types: ScenarioType[]): TreeNode[] {
  const map = new Map(types.map((t) => [t.id, { ...t, children: [] }]));
  const roots: TreeNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
```

### Tree Rendering

Each node renders:

- Expand/collapse chevron (if has children)
- Scenario type name (clickable → navigates to `/scenarios/{id}`)
- Risk tier badge (using nested `riskTier` object, colored by category)
- Count badges: failure modes, context profiles, rubrics (only shown if > 0)
- Archived indicator (grayed out text + "Archived" badge)

Expanded node shows:

- Failure modes list (name + severity badge)
- Context profiles list (name)
- Children nodes (recursive)

Indentation via `pl-{depth}` Tailwind classes.

### Version Selector

- Select dropdown at top of page showing version number + date
- Default: latest (current) version
- Switching version fetches from `/scenario-graph/versions/{version}`
- Expansion state resets on version switch (local React state)

### Changelog Section

- Below the tree, a simple table of `GraphChange[]` for the selected version
- Columns: change type (badge), entity type, summary
- Change type badges: added (green), modified (yellow), removed (red), archived (gray)

### Page Layout

```
┌─────────────────────────────────────────────────┐
│  Scenario Graph           [Version: v104 ▼]    │
│  Visualize your scenario taxonomy               │
├────────────────────┬────────────────────────────┤
│  Radar Chart       │  Radial Bar Chart          │
│  (coverage profile)│  (risk tier distribution)  │
├────────────────────┴────────────────────────────┤
│  Taxonomy Tree                                  │
│  ▸ API Safety Scenarios          [High] 3 FM    │
│    ▸ Rate Limiting               [Med]  1 FM    │
│    ▸ Auth Bypass                 [Crit] 5 FM    │
│  ▸ Data Quality Scenarios        [Low]  2 FM    │
├─────────────────────────────────────────────────┤
│  Changelog (v104)                               │
│  + added   | scenario_type | Added "Phishing"   │
│  ~ modified| risk_tier     | Updated weight      │
└─────────────────────────────────────────────────┘
```

## Acceptance Criteria

- [x] Page renders at `/scenarios/graph` (sidebar link already exists)
- [x] Radar chart shows coverage profile for scenario types
- [x] Radial bar chart shows risk tier category distribution
- [x] Tree displays all scenario types with correct parent-child hierarchy
- [x] Root nodes (parentId === null) shown at top level
- [x] Orphaned nodes (parentId references missing ID) shown as root level
- [x] Expand/collapse works on chevron click
- [x] Clicking scenario type name navigates to `/scenarios/{id}`
- [x] Risk tier badge shows name, colored by category
- [x] Count badges show failure mode, context profile, and rubric counts (hidden if 0)
- [x] Archived types shown with reduced opacity and "Archived" badge
- [x] Version selector allows switching between graph versions
- [x] Changelog table shows changes for selected version
- [x] Loading state shows skeleton
- [x] Empty state shows message when no scenario types exist

## Dependencies & Risks

- **New dependency**: `recharts` (via `pnpm dlx shadcn@latest add chart`)
- **Low risk** — single new page, read-only, no mutations, no schema changes
- **Performance**: With 23 scenario types this is trivial for both charts and tree

## Implementation Checklist

```
1. Install shadcn chart component (adds recharts + chart.tsx)
2. Define TypeScript interfaces for GraphSnapshot, ScenarioType, GraphChange
3. Implement buildTree() and chart data transform helpers
4. Implement radar chart component (coverage profile)
5. Implement radial bar chart component (risk tier distribution)
6. Implement TreeNode recursive component
7. Implement GraphContent with useApi hooks
8. Wire up version selector (Select component)
9. Wire up changelog table
10. Add loading skeleton and empty state
11. Export default page with Suspense wrapper
```

## Design Decisions

| Decision              | Choice                         | Rationale                                                         |
| --------------------- | ------------------------------ | ----------------------------------------------------------------- |
| Chart library         | shadcn Chart (Recharts)        | Consistent with shadcn/ui design system                           |
| Chart types           | Radar + Radial bar             | Radar shows multi-dimensional coverage; radial shows distribution |
| Tree library          | None (custom with shadcn)      | Only 23 types; avoid dependency for simple indent+collapse        |
| Risk tier data source | Nested `scenarioType.riskTier` | Already denormalized in snapshot; no lookup needed                |
| Cycle detection       | None                           | Backend validates via recursive CTE; trust API                    |
| Expansion state       | Local React state              | Simple; no need for URL persistence yet                           |
| Search/filter         | Not included                   | Premature for current scale; add when needed                      |

## References

- Sidebar nav config: `src/components/app-shell/sidebar.tsx:51`
- Graph API route: `app/api/v1/scenario-graph/route.ts`
- Graph domain model: `src/contexts/scenario/domain/entities/ScenarioGraph.ts:3-60`
- Graph repository: `src/contexts/scenario/infrastructure/DrizzleGraphRepository.ts:100-192`
- Page pattern reference: `app/(dashboard)/scenarios/page.tsx`
- useApi hook: `src/hooks/use-api.ts`
- shadcn chart docs: `https://ui.shadcn.com/docs/components/radix/chart`
- Recharts docs: `https://recharts.org/en-US/api`
