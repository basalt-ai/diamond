"use client";

import {
  ArrowLeftIcon,
  GitCompareIcon,
  BarChart3Icon,
  GitBranchIcon,
  LayersIcon,
  CheckCircle2Icon,
  XCircleIcon,
  LockIcon,
  LoaderIcon,
  ShieldAlertIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { JsonViewer } from "@/components/json-viewer";
import { StateBadge } from "@/components/state-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/kpi-card";
import { useApi } from "@/hooks/use-api";
import { useMutation } from "@/hooks/use-mutation";
import type { PaginatedResponse } from "@/lib/api-client";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell } from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DatasetVersion {
  id: string;
  suiteId: string;
  version: string;
  state: "draft" | "validating" | "released" | "deprecated";
  scenarioGraphVersion: string;
  selectionPolicy: Record<string, unknown>;
  candidateIds: string[];
  lineage: unknown;
  gateResults: unknown;
  diagnosticsId: string | null;
  createdAt: string;
  updatedAt: string;
  releasedAt: string | null;
}

type StateAction = "seal" | "release" | "deprecate";

const STATE_TRANSITIONS: Record<
  DatasetVersion["state"],
  { action: StateAction; label: string; description: string } | null
> = {
  draft: {
    action: "seal",
    label: "Seal Version",
    description:
      "This will move the version to validating. It cannot be edited after sealing.",
  },
  validating: {
    action: "release",
    label: "Release Version",
    description:
      "This will release the version for production use. Ensure all gates have passed.",
  },
  released: {
    action: "deprecate",
    label: "Deprecate Version",
    description:
      "This will mark the version as deprecated. It will no longer be used for new evaluations.",
  },
  deprecated: null,
};

const TABS = ["overview", "quality", "drift", "lineage", "slices"] as const;
type TabValue = (typeof TABS)[number];

function truncateId(id: string): string {
  return id.slice(0, 8) + "\u2026";
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

function OverviewTab({ version }: { version: DatasetVersion }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID</span>
              <span className="font-mono">{version.id}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Graph Version</span>
              <span>{version.scenarioGraphVersion}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Candidates</span>
              <span>{version.candidateIds.length}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(version.createdAt).toLocaleDateString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Released</span>
              <span>
                {version.releasedAt
                  ? new Date(version.releasedAt).toLocaleDateString()
                  : "\u2014"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Diagnostics ID</span>
              <span className="font-mono">
                {version.diagnosticsId
                  ? truncateId(version.diagnosticsId)
                  : "\u2014"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Selection Policy</CardTitle>
            <CardDescription>
              Policy used to select candidates for this version
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(version.selectionPolicy).length > 0 ? (
              <JsonViewer data={version.selectionPolicy} defaultExpanded />
            ) : (
              <p className="text-xs text-muted-foreground">
                No selection policy
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Placeholder tabs (filled in later tasks)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Diagnostics types
// ---------------------------------------------------------------------------

interface DiagnosticsReport {
  id: string;
  dataset_version_id: string;
  metrics: {
    agreement: {
      overall_kappa: number;
      per_scenario_kappa: Record<string, number>;
      low_agreement_slices: Array<{
        slice_name: string;
        kappa: number;
        sample_size: number;
      }>;
      sample_size: number;
    };
    redundancy: {
      redundancy_index: number;
    };
    entropy?: {
      overall_entropy: number;
      per_scenario_entropy: Record<string, number>;
      high_entropy_count: number;
    };
    shortcuts?: {
      shortcuts: Array<{
        feature: string;
        nmi: number;
        risk_level: string;
        significant: boolean;
      }>;
    };
    leakage?: {
      leakage_rate: number;
      total_leaked: number;
    };
    coverage?: {
      overall_coverage: number;
      uncovered_scenarios: string[];
      min_examples_violations: Array<{
        scenario_type_id: string;
        count: number;
        required: number;
      }>;
    };
  };
  gate_results: Array<{
    gate_name: string;
    threshold: number;
    actual: number;
    passed: boolean;
    blocking?: boolean;
    scope?: string;
    scope_target?: string;
  }> | null;
  summary: {
    redundancy_index: number;
    overall_kappa: number;
    candidate_count: number;
    overall_entropy?: number;
    leakage_rate?: number;
    coverage?: number;
  };
  created_at: string;
}

interface DiagnosticsComputing {
  status: "computing";
  dataset_version_id: string;
}

type DiagnosticsResponse = DiagnosticsReport | DiagnosticsComputing;

function isDiagnosticsReport(d: DiagnosticsResponse): d is DiagnosticsReport {
  return "metrics" in d;
}

function kappaInterpretation(kappa: number): {
  label: string;
  color: string;
} {
  if (kappa >= 0.81)
    return { label: "Almost Perfect", color: "text-green-600" };
  if (kappa >= 0.61) return { label: "Substantial", color: "text-green-500" };
  if (kappa >= 0.41) return { label: "Moderate", color: "text-yellow-600" };
  if (kappa >= 0.21) return { label: "Fair", color: "text-orange-500" };
  if (kappa >= 0) return { label: "Slight", color: "text-red-500" };
  return { label: "Poor", color: "text-red-700" };
}

function kappaBarColor(kappa: number): string {
  if (kappa >= 0.81) return "hsl(142, 71%, 45%)";
  if (kappa >= 0.61) return "hsl(142, 71%, 55%)";
  if (kappa >= 0.41) return "hsl(47, 96%, 53%)";
  if (kappa >= 0.21) return "hsl(25, 95%, 53%)";
  return "hsl(0, 84%, 60%)";
}

const kappaChartConfig: ChartConfig = {
  kappa: { label: "Kappa", color: "hsl(221, 83%, 53%)" },
};

function QualityTab({
  versionId,
  versionState,
}: {
  versionId: string;
  versionState: DatasetVersion["state"];
}) {
  const { data, isLoading, status } = useApi<DiagnosticsResponse>(
    versionState === "draft" ? null : `/dataset-versions/${versionId}/diagnostics`,
    { pollInterval: 5000 }
  );

  if (versionState === "draft") {
    return (
      <EmptyState
        icon={ShieldAlertIcon}
        title="No diagnostics"
        description="Seal this version to compute diagnostics."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (status === 202 || (data && !isDiagnosticsReport(data))) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-3 py-16">
          <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Computing diagnostics...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data || !isDiagnosticsReport(data)) {
    return (
      <EmptyState
        icon={ShieldAlertIcon}
        title="No diagnostics"
        description="Diagnostics report is not available for this version."
      />
    );
  }

  const report = data;
  const { metrics, gate_results, summary } = report;
  const kInterp = kappaInterpretation(metrics.agreement.overall_kappa);

  const scenarioKappaData = Object.entries(
    metrics.agreement.per_scenario_kappa
  )
    .map(([scenario, kappa]) => ({ scenario, kappa }))
    .sort((a, b) => a.kappa - b.kappa);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          label="Overall Kappa"
          value={metrics.agreement.overall_kappa.toFixed(3)}
          description={kInterp.label}
        />
        <KpiCard
          label="Redundancy Index"
          value={summary.redundancy_index.toFixed(3)}
        />
        <KpiCard
          label="Coverage"
          value={
            summary.coverage !== undefined
              ? `${(summary.coverage * 100).toFixed(1)}%`
              : "\u2014"
          }
        />
        <KpiCard
          label="Entropy"
          value={
            summary.overall_entropy !== undefined
              ? summary.overall_entropy.toFixed(3)
              : "\u2014"
          }
        />
      </div>

      {/* Per-scenario kappa chart */}
      {scenarioKappaData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Per-Scenario Agreement (Kappa)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={kappaChartConfig}
              className="h-64 w-full"
            >
              <BarChart
                data={scenarioKappaData}
                layout="vertical"
                margin={{ left: 120 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[-1, 1]} />
                <YAxis
                  type="category"
                  dataKey="scenario"
                  tick={{ fontSize: 10 }}
                  width={110}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="kappa" radius={[0, 4, 4, 0]}>
                  {scenarioKappaData.map((entry) => (
                    <Cell
                      key={entry.scenario}
                      fill={kappaBarColor(entry.kappa)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Low agreement slices */}
      {metrics.agreement.low_agreement_slices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Low Agreement Slices</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-2 font-medium">Slice</th>
                  <th className="px-4 py-2 font-medium">Kappa</th>
                  <th className="px-4 py-2 font-medium">Sample Size</th>
                </tr>
              </thead>
              <tbody>
                {metrics.agreement.low_agreement_slices.map((s) => (
                  <tr key={s.slice_name} className="border-b">
                    <td className="px-4 py-2">{s.slice_name}</td>
                    <td className="px-4 py-2 font-mono">
                      {s.kappa.toFixed(3)}
                    </td>
                    <td className="px-4 py-2">{s.sample_size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Gate Results */}
      {gate_results && gate_results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Gate Results</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-2 font-medium">Gate</th>
                  <th className="px-4 py-2 font-medium">Threshold</th>
                  <th className="px-4 py-2 font-medium">Actual</th>
                  <th className="px-4 py-2 font-medium">Result</th>
                  <th className="px-4 py-2 font-medium">Blocking</th>
                  <th className="px-4 py-2 font-medium">Scope</th>
                </tr>
              </thead>
              <tbody>
                {gate_results.map((g) => {
                  const rowColor = g.passed
                    ? "bg-green-50 dark:bg-green-950/20"
                    : g.blocking
                      ? "bg-red-50 dark:bg-red-950/20"
                      : "bg-amber-50 dark:bg-amber-950/20";
                  return (
                    <tr key={g.gate_name} className={`border-b ${rowColor}`}>
                      <td className="px-4 py-2 font-medium">{g.gate_name}</td>
                      <td className="px-4 py-2 font-mono">
                        {g.threshold.toFixed(3)}
                      </td>
                      <td className="px-4 py-2 font-mono">
                        {g.actual.toFixed(3)}
                      </td>
                      <td className="px-4 py-2">
                        {g.passed ? (
                          <CheckCircle2Icon className="size-4 text-green-600" />
                        ) : (
                          <XCircleIcon className="size-4 text-red-600" />
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {g.blocking ? (
                          <LockIcon className="size-3.5 text-muted-foreground" />
                        ) : (
                          "\u2014"
                        )}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {g.scope ?? "\u2014"}
                        {g.scope_target ? ` (${g.scope_target})` : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Entropy section */}
      {metrics.entropy && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Entropy{" "}
              {metrics.entropy.high_entropy_count > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {metrics.entropy.high_entropy_count} high entropy
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={kappaChartConfig} className="h-48 w-full">
              <BarChart
                data={Object.entries(metrics.entropy.per_scenario_entropy).map(
                  ([scenario, entropy]) => ({ scenario, entropy })
                )}
                layout="vertical"
                margin={{ left: 120 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis
                  type="category"
                  dataKey="scenario"
                  tick={{ fontSize: 10 }}
                  width={110}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="entropy"
                  fill="hsl(262, 83%, 58%)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Shortcuts section */}
      {metrics.shortcuts &&
        metrics.shortcuts.shortcuts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Shortcut Detection</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-4 py-2 font-medium">Feature</th>
                    <th className="px-4 py-2 font-medium">NMI</th>
                    <th className="px-4 py-2 font-medium">Risk Level</th>
                    <th className="px-4 py-2 font-medium">Significant</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.shortcuts.shortcuts.map((s) => (
                    <tr key={s.feature} className="border-b">
                      <td className="px-4 py-2">{s.feature}</td>
                      <td className="px-4 py-2 font-mono">
                        {s.nmi.toFixed(3)}
                      </td>
                      <td className="px-4 py-2">
                        <Badge
                          variant={
                            s.risk_level === "high"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {s.risk_level}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        {s.significant ? "Yes" : "No"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

      {/* Leakage section */}
      {metrics.leakage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Leakage{" "}
              <Badge variant="secondary" className="ml-2">
                {metrics.leakage.total_leaked} candidates leaked
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <KpiCard
              label="Leakage Rate"
              value={`${(metrics.leakage.leakage_rate * 100).toFixed(1)}%`}
            />
          </CardContent>
        </Card>
      )}

      {/* Coverage section */}
      {metrics.coverage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Coverage Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics.coverage.uncovered_scenarios.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium">
                  Uncovered Scenarios
                </p>
                <div className="flex flex-wrap gap-1">
                  {metrics.coverage.uncovered_scenarios.map((s) => (
                    <Badge key={s} variant="outline">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {metrics.coverage.min_examples_violations.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium">
                  Minimum Examples Violations
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-4 py-1 font-medium">Scenario</th>
                      <th className="px-4 py-1 font-medium">Count</th>
                      <th className="px-4 py-1 font-medium">Required</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.coverage.min_examples_violations.map((v) => (
                      <tr key={v.scenario_type_id} className="border-b">
                        <td className="px-4 py-1">{v.scenario_type_id}</td>
                        <td className="px-4 py-1 font-mono">{v.count}</td>
                        <td className="px-4 py-1 font-mono">{v.required}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DriftTab({ _versionId }: { _versionId: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <BarChart3Icon className="mx-auto mb-2 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Coming soon</p>
      </CardContent>
    </Card>
  );
}

function LineageTab({ _versionId }: { _versionId: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <GitBranchIcon className="mx-auto mb-2 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Coming soon</p>
      </CardContent>
    </Card>
  );
}

function SlicesTab({ _versionId }: { _versionId: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <LayersIcon className="mx-auto mb-2 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Coming soon</p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function VersionDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentTab = (searchParams.get("tab") as TabValue) || "overview";

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareVersionId, setCompareVersionId] = useState("");

  const {
    data: version,
    isLoading,
    refetch,
  } = useApi<DatasetVersion>(`/dataset-versions/${params.id}`);

  const { data: siblingVersions } = useApi<PaginatedResponse<DatasetVersion>>(
    version
      ? `/dataset-versions?page=1&page_size=100&suite_id=${version.suiteId}`
      : null
  );

  const transition = version ? STATE_TRANSITIONS[version.state] : null;

  const { mutate: transitionMutate, isPending: transitionPending } =
    useMutation("PATCH", `/dataset-versions/${params.id}/state`, {
      onSuccess: () => {
        toast.success("State transition successful");
        setConfirmOpen(false);
        refetch();
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });

  function handleTransition() {
    if (!transition) return;
    transitionMutate({ action: transition.action });
  }

  function handleTabChange(value: string) {
    const url = new URL(window.location.href);
    if (value === "overview") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", value);
    }
    router.replace(url.pathname + url.search);
  }

  function handleCompare() {
    if (!compareVersionId.trim()) {
      toast.error("Please enter a version ID to compare with");
      return;
    }
    setCompareOpen(false);
    router.push(
      `/datasets/diff?version_a=${params.id}&version_b=${compareVersionId.trim()}`
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!version) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          Dataset version not found.
        </p>
      </div>
    );
  }

  const otherVersions = (siblingVersions?.data ?? []).filter(
    (v) => v.id !== version.id
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon-sm" asChild>
          <Link href={`/datasets/${version.suiteId}`}>
            <ArrowLeftIcon className="size-4" />
            <span className="sr-only">Back to suite</span>
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Version {version.version}</h1>
            <StateBadge state={version.state} />
          </div>
          <p className="text-xs text-muted-foreground">
            Suite:{" "}
            <Link
              href={`/datasets/${version.suiteId}`}
              className="underline underline-offset-4 hover:text-primary"
            >
              {truncateId(version.suiteId)}
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCompareOpen(true)}>
            <GitCompareIcon className="size-4" />
            Compare with...
          </Button>
          {transition ? (
            <Button
              variant={
                transition.action === "deprecate" ? "destructive" : "default"
              }
              onClick={() => setConfirmOpen(true)}
              disabled={transitionPending}
            >
              {transitionPending ? "Processing..." : transition.label}
            </Button>
          ) : null}
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="drift">Drift</TabsTrigger>
          <TabsTrigger value="lineage">Lineage</TabsTrigger>
          <TabsTrigger value="slices">Slices</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab version={version} />
        </TabsContent>
        <TabsContent value="quality">
          <QualityTab versionId={params.id} versionState={version.state} />
        </TabsContent>
        <TabsContent value="drift">
          <DriftTab _versionId={params.id} />
        </TabsContent>
        <TabsContent value="lineage">
          <LineageTab _versionId={params.id} />
        </TabsContent>
        <TabsContent value="slices">
          <SlicesTab _versionId={params.id} />
        </TabsContent>
      </Tabs>

      {transition ? (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={transition.label}
          description={transition.description}
          confirmLabel={transition.label}
          onConfirm={handleTransition}
          variant={
            transition.action === "deprecate" ? "destructive" : "default"
          }
        />
      ) : null}

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compare Versions</DialogTitle>
            <DialogDescription>
              Select another version to compare with version {version.version}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {otherVersions.length > 0 ? (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Select a version
                </Label>
                <div className="flex flex-col gap-1">
                  {otherVersions.map((v) => (
                    <Button
                      key={v.id}
                      variant={
                        compareVersionId === v.id ? "default" : "outline"
                      }
                      size="sm"
                      className="justify-between"
                      onClick={() => setCompareVersionId(v.id)}
                    >
                      <span>{v.version}</span>
                      <StateBadge state={v.state} />
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
            <Field>
              <Label htmlFor="compare-id">Or enter a Version ID</Label>
              <Input
                id="compare-id"
                value={compareVersionId}
                onChange={(e) => setCompareVersionId(e.target.value)}
                placeholder="Version UUID"
                className="font-mono"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompareOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompare} disabled={!compareVersionId.trim()}>
              Compare
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function VersionDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <VersionDetailContent />
    </Suspense>
  );
}
