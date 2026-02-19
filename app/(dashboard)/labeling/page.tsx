"use client";

import { TagIcon } from "lucide-react";
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LabelTask {
  id: string;
  candidateId: string;
  rubricId: string;
  rubricVersion: number;
  scenarioTypeId: string;
  assignedTo: string | null;
  state:
    | "pending"
    | "in_progress"
    | "review"
    | "adjudication"
    | "finalized"
    | "cancelled";
  preLabel: unknown;
  adjudicationRecord: unknown;
  finalLabelId: string | null;
  labelsRequired: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATES = [
  { value: null, label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "adjudication", label: "Adjudication" },
  { value: "finalized", label: "Finalized" },
  { value: "cancelled", label: "Cancelled" },
] as const;

function truncateId(id: string): string {
  return id.slice(0, 8) + "\u2026";
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const columns: ColumnDef<LabelTask>[] = [
  {
    id: "id",
    header: "ID",
    accessorFn: (row) => truncateId(row.id),
    sortable: true,
  },
  {
    id: "candidateId",
    header: "Candidate ID",
    accessorFn: (row) => truncateId(row.candidateId),
    sortable: true,
  },
  {
    id: "state",
    header: "State",
    accessorFn: (row) => <StateBadge state={row.state} />,
    sortable: true,
  },
  {
    id: "assignedTo",
    header: "Assigned To",
    accessorFn: (row) =>
      row.assignedTo ? truncateId(row.assignedTo) : "\u2014",
    sortable: true,
  },
  {
    id: "labelsRequired",
    header: "Labels Required",
    accessorFn: (row) => row.labelsRequired,
    sortable: true,
    className: "w-32 text-right",
  },
  {
    id: "rubricId",
    header: "Rubric ID",
    accessorFn: (row) => truncateId(row.rubricId),
    sortable: true,
  },
  {
    id: "createdAt",
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
// Page
// ---------------------------------------------------------------------------

function LabelingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("page_size") ?? "20");
  const stateFilter = searchParams.get("state");

  const queryParts = [`/label-tasks?page=${page}&page_size=${pageSize}`];
  if (stateFilter) {
    queryParts.push(`state=${stateFilter}`);
  }
  const apiPath = queryParts.join("&");

  const { data, isLoading } = useApi<PaginatedResponse<LabelTask>>(apiPath);

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
        <div>
          <h1 className="text-lg font-semibold">Label Task Queue</h1>
          <p className="text-muted-foreground text-sm">
            Manage annotation tasks and track labeling progress
          </p>
        </div>
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
          <CardTitle>Label Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            isLoading={isLoading}
            onRowClick={(row) => router.push(`/labeling/${row.id}`)}
            emptyState={
              <EmptyState
                icon={TagIcon}
                title="No label tasks"
                description="Label tasks will appear here once candidates are assigned for annotation."
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

export default function LabelingPage() {
  return (
    <Suspense>
      <LabelingContent />
    </Suspense>
  );
}
