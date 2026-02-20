"use client";

import {
  ArrowLeftIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowRightIcon,
  TrendingDownIcon,
  AlertTriangleIcon,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FailureAnalysis {
  dataset_version_id: string;
  eval_run_count: number;
  model_versions: string[];
  scenario_classifications: Array<{
    scenario_type_id: string;
    classification: string;
    pass_rates: Array<{
      model_version: string;
      pass_rate: number;
      total: number;
    }>;
    trend: {
      slope: number;
      direction: string;
    };
  }>;
  summary: {
    persistently_failing: number;
    newly_failing: number;
    newly_fixed: number;
    regressing: number;
    stable_passing: number;
  };
}

function truncateId(id: string): string {
  return id.slice(0, 8) + "\u2026";
}

const CLASSIFICATION_COLORS: Record<string, string> = {
  persistently_failing:
    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  newly_failing:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  newly_fixed:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  regressing:
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  stable_passing: "bg-muted text-muted-foreground",
};

function ClassificationBadge({ classification }: { classification: string }) {
  const label = classification.replace(/_/g, " ");
  return (
    <Badge className={CLASSIFICATION_COLORS[classification] ?? ""}>
      {label}
    </Badge>
  );
}

function TrendIcon({ direction }: { direction: string }) {
  switch (direction) {
    case "improving":
      return <ArrowUpIcon className="size-3.5 text-green-600" />;
    case "degrading":
      return <ArrowDownIcon className="size-3.5 text-red-600" />;
    case "stable":
      return <ArrowRightIcon className="size-3.5 text-muted-foreground" />;
    case "fluctuating":
      return <TrendingDownIcon className="size-3.5 text-amber-600" />;
    default:
      return null;
  }
}

function passRateColor(rate: number): string {
  if (rate >= 0.8) return "bg-green-100 text-green-800 dark:bg-green-900/40";
  if (rate >= 0.5) return "bg-amber-100 text-amber-800 dark:bg-amber-900/40";
  return "bg-red-100 text-red-800 dark:bg-red-900/40";
}

// ---------------------------------------------------------------------------
// Sparkline (tiny inline bar chart)
// ---------------------------------------------------------------------------

function Sparkline({
  rates,
}: {
  rates: Array<{ model_version: string; pass_rate: number }>;
}) {
  const barWidth = 6;
  const gap = 2;
  const height = 20;
  const width = rates.length * (barWidth + gap);

  return (
    <svg width={width} height={height} className="inline-block align-middle">
      {rates.map((r, i) => {
        const barHeight = r.pass_rate * height;
        const color =
          r.pass_rate >= 0.8
            ? "hsl(142, 71%, 45%)"
            : r.pass_rate >= 0.5
              ? "hsl(47, 96%, 53%)"
              : "hsl(0, 84%, 60%)";
        return (
          <rect
            key={r.model_version}
            x={i * (barWidth + gap)}
            y={height - barHeight}
            width={barWidth}
            height={barHeight}
            fill={color}
            rx={1}
          />
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main content
// ---------------------------------------------------------------------------

function FailureAnalysisContent() {
  const searchParams = useSearchParams();
  const versionId = searchParams.get("dataset_version_id");

  const { data, isLoading, error } = useApi<FailureAnalysis>(
    versionId
      ? `/eval-results/failure-analysis?dataset_version_id=${versionId}`
      : null
  );

  if (!versionId) {
    return (
      <div className="p-6">
        <EmptyState
          icon={AlertTriangleIcon}
          title="No version selected"
          description="Navigate here from an eval results row to see failure analysis."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    // Handle InsufficientEvalRunsError
    if (error.code === "INSUFFICIENT_EVAL_RUNS") {
      return (
        <div className="p-6">
          <EmptyState
            icon={AlertTriangleIcon}
            title="Insufficient eval runs"
            description="Need at least 2 eval runs with different model versions for failure analysis."
          />
        </div>
      );
    }
    return (
      <div className="p-6">
        <EmptyState
          icon={AlertTriangleIcon}
          title="Error"
          description={error.message}
        />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon-sm" asChild>
          <Link href="/datasets/eval-results">
            <ArrowLeftIcon className="size-4" />
            <span className="sr-only">Back to eval results</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-semibold">
            Failure Analysis — {truncateId(versionId)}
          </h1>
          <p className="text-xs text-muted-foreground">
            {data.eval_run_count} eval runs across{" "}
            {data.model_versions.length} model versions
          </p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid gap-4 md:grid-cols-5">
        <KpiCard
          label="Persistently Failing"
          value={data.summary.persistently_failing}
          className="border-red-200 dark:border-red-900"
        />
        <KpiCard
          label="Newly Failing"
          value={data.summary.newly_failing}
          className="border-orange-200 dark:border-orange-900"
        />
        <KpiCard
          label="Newly Fixed"
          value={data.summary.newly_fixed}
          className="border-green-200 dark:border-green-900"
        />
        <KpiCard
          label="Regressing"
          value={data.summary.regressing}
          className="border-amber-200 dark:border-amber-900"
        />
        <KpiCard
          label="Stable Passing"
          value={data.summary.stable_passing}
        />
      </div>

      {/* Model versions */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Model versions:</span>
        {data.model_versions.map((v) => (
          <Badge key={v} variant="outline">
            {v}
          </Badge>
        ))}
      </div>

      {/* Scenario classifications table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Scenario Classifications</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left">
                <th className="px-4 py-2 font-medium">Scenario</th>
                <th className="px-4 py-2 font-medium">Classification</th>
                <th className="px-4 py-2 font-medium">Trend</th>
                <th className="px-4 py-2 font-medium">Slope</th>
                <th className="px-4 py-2 font-medium">Pass Rates</th>
              </tr>
            </thead>
            <tbody>
              {data.scenario_classifications.map((sc) => (
                <tr key={sc.scenario_type_id} className="border-b">
                  <td className="px-4 py-2">{sc.scenario_type_id}</td>
                  <td className="px-4 py-2">
                    <ClassificationBadge
                      classification={sc.classification}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <TrendIcon direction={sc.trend.direction} />
                      <span className="text-muted-foreground">
                        {sc.trend.direction}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 font-mono">
                    {sc.trend.slope.toFixed(3)}
                  </td>
                  <td className="px-4 py-2">
                    <Sparkline rates={sc.pass_rates} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pass rate matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pass Rate Matrix</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left">
                <th className="px-4 py-2 font-medium sticky left-0 bg-background">
                  Scenario
                </th>
                {data.model_versions.map((v) => (
                  <th key={v} className="px-3 py-2 font-medium text-center">
                    {v}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.scenario_classifications.map((sc) => (
                <tr key={sc.scenario_type_id} className="border-b">
                  <td className="px-4 py-2 sticky left-0 bg-background">
                    {sc.scenario_type_id}
                  </td>
                  {data.model_versions.map((mv) => {
                    const pr = sc.pass_rates.find(
                      (r) => r.model_version === mv
                    );
                    if (!pr) {
                      return (
                        <td
                          key={mv}
                          className="px-3 py-2 text-center text-muted-foreground"
                        >
                          \u2014
                        </td>
                      );
                    }
                    return (
                      <td
                        key={mv}
                        className={`px-3 py-2 text-center font-mono ${passRateColor(pr.pass_rate)}`}
                      >
                        {(pr.pass_rate * 100).toFixed(0)}%
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function FailureAnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <FailureAnalysisContent />
    </Suspense>
  );
}
