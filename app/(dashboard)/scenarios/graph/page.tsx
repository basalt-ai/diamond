"use client";

import { ChevronDownIcon, ChevronRightIcon, NetworkIcon } from "lucide-react";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
} from "recharts";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";

// ---------------------------------------------------------------------------
// Types (mirrors domain entities)
// ---------------------------------------------------------------------------

interface ScenarioType {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  archived: boolean;
  riskTier: { id: string; name: string; weight: number; category: string };
  failureModes: Array<{
    id: string;
    name: string;
    description: string;
    severity: string;
  }>;
  contextProfiles: Array<{
    id: string;
    name: string;
    attributes: Record<string, unknown>;
  }>;
  rubricIds: string[];
}

interface GraphSnapshot {
  scenarioTypes: ScenarioType[];
  failureModes: Array<{
    id: string;
    name: string;
    description: string;
    severity: string;
  }>;
  riskTiers: Array<{
    id: string;
    name: string;
    weight: number;
    category: string;
  }>;
  contextProfiles: Array<{
    id: string;
    name: string;
    attributes: Record<string, unknown>;
  }>;
}

interface GraphChange {
  changeType: "added" | "modified" | "removed" | "archived";
  entityType: string;
  entityId: string;
  summary: string;
}

interface GraphVersionSummary {
  id: string;
  version: number;
  createdAt: string;
}

interface GraphVersionFull {
  id: string;
  version: number;
  snapshot: GraphSnapshot;
  changes: GraphChange[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Tree helpers
// ---------------------------------------------------------------------------

type TreeNode = ScenarioType & { children: TreeNode[] };

function buildTree(types: ScenarioType[]): TreeNode[] {
  const map = new Map(
    types.map((t) => [t.id, { ...t, children: [] as TreeNode[] }])
  );
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

// ---------------------------------------------------------------------------
// Chart data helpers
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  safety: "hsl(0, 84%, 60%)",
  business: "hsl(221, 83%, 53%)",
  compliance: "hsl(262, 83%, 58%)",
  operational: "hsl(25, 95%, 53%)",
  ethical: "hsl(142, 71%, 45%)",
  reputational: "hsl(47, 96%, 53%)",
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category.toLowerCase()] ?? "hsl(220, 9%, 46%)";
}

function buildRadarData(types: ScenarioType[]) {
  return types.map((st) => ({
    name: st.name.length > 16 ? `${st.name.slice(0, 14)}...` : st.name,
    failureModes: st.failureModes.length,
    contextProfiles: st.contextProfiles.length,
    rubrics: st.rubricIds.length,
    riskWeight: st.riskTier.weight,
  }));
}

function buildRadialData(types: ScenarioType[]) {
  const groups: Record<string, number> = {};
  for (const st of types) {
    const cat = st.riskTier.category;
    groups[cat] = (groups[cat] ?? 0) + 1;
  }
  return Object.entries(groups).map(([category, count]) => ({
    category,
    count,
    fill: getCategoryColor(category),
  }));
}

const radarConfig: ChartConfig = {
  failureModes: { label: "Failure Modes", color: "hsl(0, 84%, 60%)" },
  contextProfiles: { label: "Context Profiles", color: "hsl(221, 83%, 53%)" },
  rubrics: { label: "Rubrics", color: "hsl(142, 71%, 45%)" },
  riskWeight: { label: "Risk Weight", color: "hsl(25, 95%, 53%)" },
};

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function SeverityBadge({ severity }: { severity: string }) {
  const variant =
    severity === "critical" || severity === "high"
      ? "destructive"
      : severity === "medium"
        ? "secondary"
        : "outline";
  return <Badge variant={variant}>{severity}</Badge>;
}

function ChangeTypeBadge({ type }: { type: GraphChange["changeType"] }) {
  const cls: Record<string, string> = {
    added: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    modified:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    removed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    archived: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  };
  return (
    <Badge variant="outline" className={cls[type]}>
      {type}
    </Badge>
  );
}

function TreeNodeRow({
  node,
  depth,
  expanded,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  const isOpen = expanded.has(node.id);
  const hasChildren = node.children.length > 0;
  const hasDetails =
    node.failureModes.length > 0 || node.contextProfiles.length > 0;
  const isExpandable = hasChildren || hasDetails;

  return (
    <>
      <div
        className={`flex items-center gap-2 border-b px-2 py-1.5 ${node.archived ? "opacity-50" : ""}`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {isExpandable ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            {isOpen ? (
              <ChevronDownIcon className="size-4" />
            ) : (
              <ChevronRightIcon className="size-4" />
            )}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <Link
          href={`/scenarios/${node.id}`}
          className="hover:underline truncate font-medium text-xs"
        >
          {node.name}
        </Link>

        <Badge
          variant="outline"
          className="shrink-0"
          style={{
            borderColor: getCategoryColor(node.riskTier.category),
            color: getCategoryColor(node.riskTier.category),
          }}
        >
          {node.riskTier.name}
        </Badge>

        {node.failureModes.length > 0 && (
          <Badge variant="secondary" className="shrink-0">
            {node.failureModes.length} FM
          </Badge>
        )}
        {node.contextProfiles.length > 0 && (
          <Badge variant="secondary" className="shrink-0">
            {node.contextProfiles.length} CP
          </Badge>
        )}
        {node.rubricIds.length > 0 && (
          <Badge variant="secondary" className="shrink-0">
            {node.rubricIds.length} R
          </Badge>
        )}
        {node.archived && <Badge variant="outline">Archived</Badge>}
      </div>

      {isOpen && (
        <>
          {node.failureModes.length > 0 && (
            <div
              className="border-b px-2 py-1"
              style={{ paddingLeft: `${(depth + 1) * 20 + 28}px` }}
            >
              <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide mb-1">
                Failure Modes
              </p>
              <div className="flex flex-wrap gap-1">
                {node.failureModes.map((fm) => (
                  <span key={fm.id} className="flex items-center gap-1">
                    <span className="text-xs">{fm.name}</span>
                    <SeverityBadge severity={fm.severity} />
                  </span>
                ))}
              </div>
            </div>
          )}
          {node.contextProfiles.length > 0 && (
            <div
              className="border-b px-2 py-1"
              style={{ paddingLeft: `${(depth + 1) * 20 + 28}px` }}
            >
              <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide mb-1">
                Context Profiles
              </p>
              <div className="flex flex-wrap gap-1">
                {node.contextProfiles.map((cp) => (
                  <Badge key={cp.id} variant="outline">
                    {cp.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </>
      )}
    </>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main content
// ---------------------------------------------------------------------------

function GraphContent() {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Fetch version list
  const { data: versionsData, isLoading: versionsLoading } = useApi<{
    data: GraphVersionSummary[];
    pagination: { total: number };
  }>("/scenario-graph/versions?limit=20");

  // Fetch selected version (or current if none selected)
  const versionPath = selectedVersion
    ? `/scenario-graph/versions/${selectedVersion}`
    : "/scenario-graph";

  const { data: graphData, isLoading: graphLoading } =
    useApi<GraphVersionFull>(versionPath);

  const tree = useMemo(
    () => buildTree(graphData?.snapshot.scenarioTypes ?? []),
    [graphData]
  );

  const radarData = useMemo(
    () => buildRadarData(graphData?.snapshot.scenarioTypes ?? []),
    [graphData]
  );

  const radialData = useMemo(
    () => buildRadialData(graphData?.snapshot.scenarioTypes ?? []),
    [graphData]
  );

  const radialConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    for (const d of radialData) {
      cfg[d.category] = { label: d.category, color: d.fill };
    }
    return cfg;
  }, [radialData]);

  function handleToggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleVersionChange(version: string) {
    setSelectedVersion(version === "current" ? null : version);
    setExpanded(new Set());
  }

  if (graphLoading || versionsLoading) {
    return <LoadingSkeleton />;
  }

  if (!graphData || graphData.snapshot.scenarioTypes.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={NetworkIcon}
          title="No scenario graph"
          description="Create scenario types to build your taxonomy graph."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Scenario Graph</h1>
          <p className="text-xs text-muted-foreground">
            Visualize your scenario taxonomy
          </p>
        </div>
        <Select
          value={selectedVersion ?? "current"}
          onValueChange={handleVersionChange}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Version" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">
              Latest (v{graphData.version})
            </SelectItem>
            {(versionsData?.data ?? []).map((v) => (
              <SelectItem key={v.id} value={String(v.version)}>
                v{v.version} &mdash;{" "}
                {new Date(v.createdAt).toLocaleDateString()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Radar chart */}
        <Card>
          <CardHeader>
            <CardTitle>Coverage Profile</CardTitle>
            <CardDescription>
              Per-scenario-type coverage across dimensions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={radarConfig} className="h-64 w-full">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis tick={{ fontSize: 9 }} />
                <Radar
                  dataKey="failureModes"
                  stroke="var(--color-failureModes)"
                  fill="var(--color-failureModes)"
                  fillOpacity={0.2}
                />
                <Radar
                  dataKey="contextProfiles"
                  stroke="var(--color-contextProfiles)"
                  fill="var(--color-contextProfiles)"
                  fillOpacity={0.2}
                />
                <Radar
                  dataKey="rubrics"
                  stroke="var(--color-rubrics)"
                  fill="var(--color-rubrics)"
                  fillOpacity={0.2}
                />
                <Radar
                  dataKey="riskWeight"
                  stroke="var(--color-riskWeight)"
                  fill="var(--color-riskWeight)"
                  fillOpacity={0.2}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
              </RadarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Radial bar chart */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Tier Distribution</CardTitle>
            <CardDescription>
              Scenario types by risk tier category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={radialConfig} className="h-64 w-full">
              <RadialBarChart
                data={radialData}
                innerRadius={30}
                outerRadius={110}
              >
                <PolarAngleAxis
                  type="number"
                  domain={[0, "auto"]}
                  tick={false}
                />
                <RadialBar dataKey="count" background />
                <ChartTooltip
                  content={<ChartTooltipContent nameKey="category" />}
                />
              </RadialBarChart>
            </ChartContainer>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              {radialData.map((d) => (
                <div key={d.category} className="flex items-center gap-1.5">
                  <div
                    className="size-2.5 rounded-sm"
                    style={{ backgroundColor: d.fill }}
                  />
                  <span className="text-xs capitalize">{d.category}</span>
                  <span className="text-muted-foreground text-xs">
                    ({d.count})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Taxonomy Tree */}
      <Card>
        <CardHeader>
          <CardTitle>Taxonomy Tree</CardTitle>
          <CardDescription>
            {graphData.snapshot.scenarioTypes.length} scenario types
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-t">
            {tree.map((node) => (
              <TreeNodeRow
                key={node.id}
                node={node}
                depth={0}
                expanded={expanded}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Changelog */}
      {graphData.changes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Changelog (v{graphData.version})</CardTitle>
            <CardDescription>
              {graphData.changes.length} changes in this version
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-2 font-medium">Change</th>
                  <th className="px-4 py-2 font-medium">Entity</th>
                  <th className="px-4 py-2 font-medium">Summary</th>
                </tr>
              </thead>
              <tbody>
                {graphData.changes.map((change, i) => (
                  <tr key={`${change.entityId}-${i}`} className="border-b">
                    <td className="px-4 py-2">
                      <ChangeTypeBadge type={change.changeType} />
                    </td>
                    <td className="text-muted-foreground px-4 py-2">
                      {change.entityType}
                    </td>
                    <td className="px-4 py-2">{change.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ScenarioGraphPage() {
  return (
    <Suspense>
      <GraphContent />
    </Suspense>
  );
}
