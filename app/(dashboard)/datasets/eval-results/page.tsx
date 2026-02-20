"use client";

import { ArrowLeftIcon, BarChart3Icon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { DataTable, type ColumnDef } from "@/components/data-table/data-table";
import { Pagination } from "@/components/data-table/pagination";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import type { PaginatedResponse } from "@/lib/api-client";

interface EvalRun {
  id: string;
  datasetVersionId: string;
  modelName: string;
  modelVersion: string;
  evalRunExternalId: string | null;
  totalResults: number;
  passedCount: number;
  passRate: number;
  createdAt: string;
}

function truncateId(id: string): string {
  return id.slice(0, 8) + "\u2026";
}

function PassRateBadge({ rate }: { rate: number }) {
  const pct = (rate * 100).toFixed(1);
  if (rate >= 0.8) {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        {pct}%
      </Badge>
    );
  }
  if (rate >= 0.5) {
    return (
      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
        {pct}%
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
      {pct}%
    </Badge>
  );
}

function EvalResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [versionFilter, setVersionFilter] = useState(
    searchParams.get("dataset_version_id") ?? ""
  );
  const [modelFilter, setModelFilter] = useState(
    searchParams.get("model_name") ?? ""
  );
  const [modelVersionFilter, setModelVersionFilter] = useState(
    searchParams.get("model_version") ?? ""
  );

  const page = Number(searchParams.get("page") ?? "1");

  // Build query string
  const queryParts: string[] = [`page=${page}`, "page_size=20"];
  if (versionFilter.trim())
    queryParts.push(`dataset_version_id=${versionFilter.trim()}`);
  if (modelFilter.trim()) queryParts.push(`model_name=${modelFilter.trim()}`);
  if (modelVersionFilter.trim())
    queryParts.push(`model_version=${modelVersionFilter.trim()}`);
  const queryString = queryParts.join("&");

  const { data, isLoading } = useApi<PaginatedResponse<EvalRun>>(
    `/eval-results?${queryString}`
  );

  function applyFilters() {
    const params = new URLSearchParams();
    if (versionFilter.trim())
      params.set("dataset_version_id", versionFilter.trim());
    if (modelFilter.trim()) params.set("model_name", modelFilter.trim());
    if (modelVersionFilter.trim())
      params.set("model_version", modelVersionFilter.trim());
    router.push(`/datasets/eval-results?${params.toString()}`);
  }

  const columns: ColumnDef<EvalRun>[] = [
    {
      id: "modelName",
      header: "Model",
      accessorFn: (row) => row.modelName,
      sortable: true,
    },
    {
      id: "modelVersion",
      header: "Version",
      accessorFn: (row) => row.modelVersion,
    },
    {
      id: "datasetVersion",
      header: "Dataset Version",
      accessorFn: (row) => (
        <Link
          href={`/datasets/versions/${row.datasetVersionId}`}
          className="font-mono underline underline-offset-4 hover:text-primary"
        >
          {truncateId(row.datasetVersionId)}
        </Link>
      ),
    },
    {
      id: "results",
      header: "Results",
      accessorFn: (row) => row.totalResults,
      sortable: true,
    },
    {
      id: "passRate",
      header: "Pass Rate",
      accessorFn: (row) => <PassRateBadge rate={row.passRate} />,
      sortable: true,
    },
    {
      id: "externalId",
      header: "External ID",
      accessorFn: (row) =>
        row.evalRunExternalId ? truncateId(row.evalRunExternalId) : "\u2014",
    },
    {
      id: "createdAt",
      header: "Created",
      accessorFn: (row) => new Date(row.createdAt).toLocaleDateString(),
      sortable: true,
    },
    {
      id: "actions",
      header: "",
      accessorFn: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            router.push(
              `/datasets/eval-results/failure-analysis?dataset_version_id=${row.datasetVersionId}`
            );
          }}
        >
          Failure Analysis
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon-sm" asChild>
          <Link href="/datasets">
            <ArrowLeftIcon className="size-4" />
            <span className="sr-only">Back to datasets</span>
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Eval Results</h1>
          <p className="text-xs text-muted-foreground">
            Browse evaluation results across model versions
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Dataset Version ID
          </label>
          <Input
            value={versionFilter}
            onChange={(e) => setVersionFilter(e.target.value)}
            placeholder="UUID"
            className="w-64 font-mono text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Model Name</label>
          <Input
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            placeholder="e.g. gpt-4"
            className="w-40 text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Model Version</label>
          <Input
            value={modelVersionFilter}
            onChange={(e) => setModelVersionFilter(e.target.value)}
            placeholder="e.g. v1.2"
            className="w-40 text-xs"
          />
        </div>
        <Button size="sm" onClick={applyFilters}>
          <SearchIcon className="size-4" />
          Filter
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon={BarChart3Icon}
            title="No eval results"
            description="Ingest results from your CI pipeline."
          />
        }
      />

      {data?.pagination ? (
        <Pagination
          total={data.pagination.total}
          page={data.pagination.page}
          pageSize={data.pagination.pageSize}
        />
      ) : null}
    </div>
  );
}

export default function EvalResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <EvalResultsContent />
    </Suspense>
  );
}
