"use client";

import { InboxIcon, UploadIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";

import { DataTable } from "@/components/data-table/data-table";
import type { ColumnDef } from "@/components/data-table/data-table";
import { Pagination } from "@/components/data-table/pagination";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/use-api";
import type { PaginatedResponse } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Episode {
  id: string;
  source: string;
  sourceTraceId: string;
  ingestedAt: string;
  occurredAt: string | null;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  trace: Record<string, unknown>;
  outcomes: Record<string, unknown>;
  modelVersion: string | null;
  locale: string | null;
  planTier: string | null;
  device: string | null;
  scenarioTypeId: string | null;
  hasNegativeFeedback: boolean;
  metadata: Record<string, unknown>;
  piiRedactionCount: number;
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const columns: ColumnDef<Episode>[] = [
  {
    id: "source",
    header: "Source",
    accessorFn: (row) => row.source,
    sortable: true,
  },
  {
    id: "modelVersion",
    header: "Model Version",
    accessorFn: (row) => row.modelVersion ?? "-",
    sortable: true,
    className: "w-36",
  },
  {
    id: "occurredAt",
    header: "Occurred At",
    accessorFn: (row) =>
      row.occurredAt ? new Date(row.occurredAt).toLocaleDateString() : "-",
    sortable: true,
    className: "w-32",
  },
  {
    id: "ingestedAt",
    header: "Ingested At",
    accessorFn: (row) => new Date(row.ingestedAt).toLocaleDateString(),
    sortable: true,
    className: "w-32",
  },
  {
    id: "negativeFeedback",
    header: "Negative Feedback",
    accessorFn: (row) =>
      row.hasNegativeFeedback ? (
        <Badge variant="destructive">Yes</Badge>
      ) : (
        <span className="text-muted-foreground">No</span>
      ),
    className: "w-36",
  },
  {
    id: "piiRedactions",
    header: "PII Redactions",
    accessorFn: (row) => row.piiRedactionCount,
    sortable: true,
    className: "w-32 text-right",
  },
];

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

interface FilterBarProps {
  source: string;
  modelVersion: string;
  onSourceChange: (value: string) => void;
  onModelVersionChange: (value: string) => void;
}

function FilterBar({
  source,
  modelVersion,
  onSourceChange,
  onModelVersionChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="filter-source">Source</Label>
        <Input
          id="filter-source"
          placeholder="Filter by source..."
          value={source}
          onChange={(e) => onSourceChange(e.target.value)}
          className="w-48"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="filter-model-version">Model Version</Label>
        <Input
          id="filter-model-version"
          placeholder="Filter by model version..."
          value={modelVersion}
          onChange={(e) => onModelVersionChange(e.target.value)}
          className="w-48"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function EpisodesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("page_size") ?? "20");
  const sourceParam = searchParams.get("source") ?? "";
  const modelVersionParam = searchParams.get("model_version") ?? "";

  const [source, setSource] = useState(sourceParam);
  const [modelVersion, setModelVersion] = useState(modelVersionParam);

  const buildPath = useCallback(
    (overrides?: {
      source?: string;
      model_version?: string;
      page?: number;
    }) => {
      const params = new URLSearchParams();
      const s = overrides?.source ?? source;
      const mv = overrides?.model_version ?? modelVersion;
      const p = overrides?.page ?? 1;

      params.set("page", String(p));
      params.set("page_size", String(pageSize));
      if (s) params.set("source", s);
      if (mv) params.set("model_version", mv);

      return params.toString();
    },
    [source, modelVersion, pageSize]
  );

  const applyFilters = useCallback(
    (newSource: string, newModelVersion: string) => {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("page_size", String(pageSize));
      if (newSource) params.set("source", newSource);
      if (newModelVersion) params.set("model_version", newModelVersion);
      router.push(`?${params.toString()}`);
    },
    [router, pageSize]
  );

  const handleSourceChange = useCallback(
    (value: string) => {
      setSource(value);
      applyFilters(value, modelVersion);
    },
    [applyFilters, modelVersion]
  );

  const handleModelVersionChange = useCallback(
    (value: string) => {
      setModelVersion(value);
      applyFilters(source, value);
    },
    [applyFilters, source]
  );

  const apiPath = `/episodes?${buildPath({ source, model_version: modelVersion, page })}`;
  const { data, isLoading } = useApi<PaginatedResponse<Episode>>(apiPath);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Episodes</h1>
          <p className="text-muted-foreground mt-1">
            Browse and manage ingested episodes
          </p>
        </div>
        <Button asChild>
          <Link href="/episodes/ingest">
            <UploadIcon className="mr-2 size-4" />
            Ingest Episode
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <FilterBar
            source={source}
            modelVersion={modelVersion}
            onSourceChange={handleSourceChange}
            onModelVersionChange={handleModelVersionChange}
          />
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            isLoading={isLoading}
            onRowClick={(row) => router.push(`/episodes/${row.id}`)}
            emptyState={
              <EmptyState
                icon={InboxIcon}
                title="No episodes ingested yet"
                description="Ingest your first episode to get started."
                action={{
                  label: "Ingest Episode",
                  onClick: () => router.push("/episodes/ingest"),
                }}
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
        </CardContent>
      </Card>
    </div>
  );
}

export default function EpisodesPage() {
  return (
    <Suspense>
      <EpisodesContent />
    </Suspense>
  );
}
