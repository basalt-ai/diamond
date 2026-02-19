"use client";

import { Inbox } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { DataTable, type ColumnDef } from "@/components/data-table/data-table";
import { Pagination } from "@/components/data-table/pagination";
import { EmptyState } from "@/components/empty-state";
import { StateBadge } from "@/components/state-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import type { PaginatedResponse } from "@/lib/api-client";

interface Candidate {
  id: string;
  episodeId: string;
  scenarioTypeId: string | null;
  state: "raw" | "scored" | "selected" | "labeled" | "validated" | "released";
  mappingConfidence: number;
  scores: Record<string, unknown>;
  features: Record<string, unknown>;
  selectionRunId: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATES = [
  { value: null, label: "All" },
  { value: "raw", label: "Raw" },
  { value: "scored", label: "Scored" },
  { value: "selected", label: "Selected" },
  { value: "labeled", label: "Labeled" },
  { value: "validated", label: "Validated" },
  { value: "released", label: "Released" },
] as const;

function truncateId(id: string): string {
  return id.slice(0, 8) + "\u2026";
}

const columns: ColumnDef<Candidate>[] = [
  {
    id: "id",
    header: "ID",
    accessorFn: (row) => truncateId(row.id),
    sortable: true,
  },
  {
    id: "episodeId",
    header: "Episode ID",
    accessorFn: (row) => truncateId(row.episodeId),
    sortable: true,
  },
  {
    id: "state",
    header: "State",
    accessorFn: (row) => <StateBadge state={row.state} />,
    sortable: true,
  },
  {
    id: "confidence",
    header: "Confidence",
    accessorFn: (row) => row.mappingConfidence.toFixed(2),
    sortable: true,
  },
  {
    id: "scenarioType",
    header: "Scenario Type",
    accessorFn: (row) =>
      row.scenarioTypeId ? truncateId(row.scenarioTypeId) : "\u2014",
    sortable: true,
  },
  {
    id: "createdAt",
    header: "Created",
    accessorFn: (row) => new Date(row.createdAt).toLocaleDateString(),
    sortable: true,
  },
];

function CandidatesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("page_size") ?? "20");
  const stateFilter = searchParams.get("state");

  const queryParts = [`/candidates?page=${page}&page_size=${pageSize}`];
  if (stateFilter) {
    queryParts.push(`state=${stateFilter}`);
  }
  const apiPath = queryParts.join("&");

  const { data, isLoading } = useApi<PaginatedResponse<Candidate>>(apiPath);

  function handleStateFilter(value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("state", value);
    } else {
      params.delete("state");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Candidates</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATES.map((s) => (
          <Button
            key={s.label}
            variant={stateFilter === s.value ? "default" : "outline"}
            size="sm"
            onClick={() => handleStateFilter(s.value)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Candidates</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            isLoading={isLoading}
            onRowClick={(row) => router.push(`/candidates/${row.id}`)}
            emptyState={
              <EmptyState
                icon={Inbox}
                title="No candidates yet"
                description="Candidates will appear here once episodes are ingested and processed."
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

export default function CandidatesPage() {
  return (
    <Suspense>
      <CandidatesContent />
    </Suspense>
  );
}
