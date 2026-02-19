"use client";

import {
  CheckCircleIcon,
  ClockIcon,
  GaugeIcon,
  PlayIcon,
  TagIcon,
  XCircleIcon,
} from "lucide-react";

import { KpiCard } from "@/components/kpi-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatsResponse {
  episodes: { total: number };
  candidates: {
    raw: number;
    scored: number;
    selected: number;
    labeled: number;
    validated: number;
    released: number;
  };
  labelTasks: {
    pending: number;
    in_progress: number;
    completed: number;
  };
  datasetSuites: { total: number };
  datasetVersions: {
    draft: number;
    finalized: number;
    deprecated: number;
  };
  exports: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function KpiSkeleton() {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <Skeleton className="size-4" />
        <Skeleton className="h-3 w-20" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AgreementMetricsPage() {
  const { data: stats, isLoading } = useApi<StatsResponse>("/stats");

  const pending = stats?.labelTasks.pending ?? 0;
  const inProgress = stats?.labelTasks.in_progress ?? 0;
  const completed = stats?.labelTasks.completed ?? 0;
  const total = pending + inProgress + completed;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold">Agreement Metrics</h1>
        <p className="text-muted-foreground text-sm">
          Inter-annotator agreement and adjudication status
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {isLoading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              label="Total Tasks"
              value={total}
              icon={TagIcon}
              description="All label tasks"
            />
            <KpiCard
              label="Pending"
              value={pending}
              icon={ClockIcon}
              description="Awaiting assignment"
            />
            <KpiCard
              label="In Progress"
              value={inProgress}
              icon={PlayIcon}
              description="Currently being annotated"
            />
            <KpiCard
              label="Completed"
              value={completed}
              icon={CheckCircleIcon}
              description="Finalized tasks"
            />
            <KpiCard
              label="Completion Rate"
              value={
                total > 0
                  ? `${Math.round((completed / total) * 100)}%`
                  : "\u2014"
              }
              icon={GaugeIcon}
              description="Tasks finalized"
            />
            <KpiCard
              label="Pending Review"
              value={pending + inProgress}
              icon={XCircleIcon}
              description="Needs attention"
            />
          </>
        )}
      </div>

      {/* Phase 2 notice */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Agreement Metrics</CardTitle>
          <CardDescription>
            Inter-annotator agreement scores, Cohen's Kappa, and per-rubric
            breakdowns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-center">
            <GaugeIcon className="text-muted-foreground size-12" />
            <p className="text-sm font-medium">Coming in Phase 2</p>
            <p className="max-w-md text-xs">
              Detailed inter-annotator agreement metrics, including Cohen's
              Kappa, Fleiss' Kappa, and per-rubric agreement breakdowns will be
              available in a future release.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
