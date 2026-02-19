"use client";

import {
  DatabaseIcon,
  DownloadIcon,
  PackageIcon,
  PlayIcon,
  PlusIcon,
  TagIcon,
  UploadIcon,
} from "lucide-react";
import Link from "next/link";

import { DataTable } from "@/components/data-table/data-table";
import type { ColumnDef } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/kpi-card";
import { StateBadge } from "@/components/state-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import type { PaginatedResponse } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Response types
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

interface DatasetSuite {
  id: string;
  name: string;
  description: string | null;
  versionCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ExportJob {
  id: string;
  name: string;
  format: string;
  state: string;
  createdAt: string;
  completedAt: string | null;
}

// ---------------------------------------------------------------------------
// Table column definitions
// ---------------------------------------------------------------------------

const datasetColumns: ColumnDef<DatasetSuite>[] = [
  {
    id: "name",
    header: "Name",
    accessorFn: (row) => row.name,
    sortable: true,
  },
  {
    id: "versions",
    header: "Versions",
    accessorFn: (row) => row.versionCount,
    sortable: true,
    className: "w-24 text-right",
  },
  {
    id: "updated",
    header: "Updated",
    accessorFn: (row) =>
      new Date(row.updatedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    sortable: true,
    className: "w-28",
  },
];

const exportColumns: ColumnDef<ExportJob>[] = [
  {
    id: "name",
    header: "Name",
    accessorFn: (row) => row.name,
    sortable: true,
  },
  {
    id: "format",
    header: "Format",
    accessorFn: (row) => row.format.toUpperCase(),
    className: "w-24",
  },
  {
    id: "state",
    header: "State",
    accessorFn: (row) => <StateBadge state={row.state} />,
    className: "w-28",
  },
  {
    id: "created",
    header: "Created",
    accessorFn: (row) =>
      new Date(row.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    sortable: true,
    className: "w-28",
  },
];

// ---------------------------------------------------------------------------
// Loading skeleton for KPI cards
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
// Dashboard page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const stats = useApi<StatsResponse>("/stats");
  const datasets = useApi<PaginatedResponse<DatasetSuite>>(
    "/dataset-suites?page=1&page_size=5"
  );
  const exports = useApi<PaginatedResponse<ExportJob>>(
    "/exports?page=1&page_size=5"
  );

  const pendingReviews =
    (stats.data?.labelTasks.pending ?? 0) +
    (stats.data?.labelTasks.in_progress ?? 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Platform overview and quick actions
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.isLoading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              label="Total Episodes"
              value={stats.data?.episodes.total ?? 0}
              icon={PlayIcon}
              description="Ingested episodes"
            />
            <KpiCard
              label="Pending Reviews"
              value={pendingReviews}
              icon={TagIcon}
              description="Labels awaiting review"
            />
            <KpiCard
              label="Active Datasets"
              value={stats.data?.datasetSuites.total ?? 0}
              icon={DatabaseIcon}
              description="Dataset suites"
            />
            <KpiCard
              label="Recent Exports"
              value={stats.data?.exports.completed ?? 0}
              icon={DownloadIcon}
              description="Completed exports"
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <Link href="/scenarios">
            <PlusIcon className="mr-2 size-4" />
            Create Scenario
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/episodes">
            <UploadIcon className="mr-2 size-4" />
            Import Episodes
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/exports">
            <PackageIcon className="mr-2 size-4" />
            Trigger Export
          </Link>
        </Button>
      </div>

      {/* Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Datasets */}
        <Card>
          <CardHeader>
            <CardTitle>Active Datasets</CardTitle>
            <CardDescription>Latest dataset suites</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={datasetColumns}
              data={datasets.data?.data ?? []}
              isLoading={datasets.isLoading}
              emptyState={
                <EmptyState
                  icon={DatabaseIcon}
                  title="No datasets yet"
                  description="Create your first dataset suite to get started."
                />
              }
            />
          </CardContent>
        </Card>

        {/* Recent Exports */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Exports</CardTitle>
            <CardDescription>Latest export jobs</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={exportColumns}
              data={exports.data?.data ?? []}
              isLoading={exports.isLoading}
              emptyState={
                <EmptyState
                  icon={DownloadIcon}
                  title="No exports yet"
                  description="Trigger an export to package your dataset."
                />
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
