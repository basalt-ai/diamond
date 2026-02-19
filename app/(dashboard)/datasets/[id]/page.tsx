"use client";

import { ArrowLeftIcon, LayersIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { DataTable, type ColumnDef } from "@/components/data-table/data-table";
import { Pagination } from "@/components/data-table/pagination";
import { EmptyState } from "@/components/empty-state";
import { StateBadge } from "@/components/state-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { useMutation } from "@/hooks/use-mutation";
import type { PaginatedResponse } from "@/lib/api-client";

interface DatasetSuite {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

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

const PAGE_SIZE = 20;

const versionColumns: ColumnDef<DatasetVersion>[] = [
  {
    id: "version",
    header: "Version",
    accessorFn: (row) => row.version,
    sortable: true,
  },
  {
    id: "state",
    header: "State",
    accessorFn: (row) => <StateBadge state={row.state} />,
    sortable: true,
  },
  {
    id: "graphVersion",
    header: "Graph Version",
    accessorFn: (row) => row.scenarioGraphVersion,
  },
  {
    id: "candidates",
    header: "Candidates",
    accessorFn: (row) => row.candidateIds.length,
    sortable: true,
  },
  {
    id: "createdAt",
    header: "Created",
    accessorFn: (row) => new Date(row.createdAt).toLocaleDateString(),
    sortable: true,
  },
  {
    id: "releasedAt",
    header: "Released At",
    accessorFn: (row) =>
      row.releasedAt ? new Date(row.releasedAt).toLocaleDateString() : "\u2014",
  },
];

export default function SuiteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [version, setVersion] = useState("");
  const [graphVersion, setGraphVersion] = useState("");
  const [selectionPolicy, setSelectionPolicy] = useState("");
  const [candidateIds, setCandidateIds] = useState("");
  const [versionsPage] = useState(1);

  const { data: suite, isLoading } = useApi<DatasetSuite>(
    `/dataset-suites/${params.id}`
  );

  const {
    data: versionsData,
    isLoading: versionsLoading,
    refetch,
  } = useApi<PaginatedResponse<DatasetVersion>>(
    `/dataset-versions?page=${versionsPage}&page_size=${PAGE_SIZE}&suite_id=${params.id}`
  );

  const { mutate, isPending } = useMutation("POST", "/dataset-versions", {
    onSuccess: () => {
      toast.success("Dataset version created");
      setDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  function resetForm() {
    setVersion("");
    setGraphVersion("");
    setSelectionPolicy("");
    setCandidateIds("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let parsedPolicy: Record<string, unknown> | undefined;
    if (selectionPolicy.trim()) {
      try {
        parsedPolicy = JSON.parse(selectionPolicy) as Record<string, unknown>;
      } catch {
        toast.error("Invalid JSON in selection policy field");
        return;
      }
    }

    let parsedCandidateIds: string[] | undefined;
    if (candidateIds.trim()) {
      try {
        const parsed: unknown = JSON.parse(candidateIds);
        if (
          !Array.isArray(parsed) ||
          !parsed.every((v): v is string => typeof v === "string")
        ) {
          toast.error("Candidate IDs must be a JSON array of strings");
          return;
        }
        parsedCandidateIds = parsed;
      } catch {
        toast.error("Invalid JSON in candidate IDs field");
        return;
      }
    }

    mutate({
      suite_id: params.id,
      version,
      scenario_graph_version: graphVersion,
      selection_policy: parsedPolicy,
      candidate_ids: parsedCandidateIds,
    });
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

  if (!suite) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          Dataset suite not found.
        </p>
      </div>
    );
  }

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
          <h1 className="text-lg font-semibold">{suite.name}</h1>
          <p className="text-xs text-muted-foreground">{suite.description}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon className="size-4" />
          Create Version
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">ID</span>
            <span className="font-mono">{suite.id}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>{new Date(suite.createdAt).toLocaleDateString()}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Updated</span>
            <span>{new Date(suite.updatedAt).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold">Versions</h2>
        <DataTable
          columns={versionColumns}
          data={versionsData?.data ?? []}
          isLoading={versionsLoading}
          onRowClick={(row) => router.push(`/datasets/versions/${row.id}`)}
          emptyState={
            <EmptyState
              icon={LayersIcon}
              title="No versions"
              description="Create the first version for this dataset suite."
              action={{
                label: "Create Version",
                onClick: () => setDialogOpen(true),
              }}
            />
          }
        />
        {versionsData?.pagination ? (
          <Pagination
            total={versionsData.pagination.total}
            page={versionsData.pagination.page}
            pageSize={versionsData.pagination.pageSize}
          />
        ) : null}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Dataset Version</DialogTitle>
            <DialogDescription>
              Add a new version to this dataset suite.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field>
              <Label htmlFor="dv-version">Version</Label>
              <Input
                id="dv-version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. 1.0.0"
                required
              />
            </Field>
            <Field>
              <Label htmlFor="dv-graph">Scenario Graph Version</Label>
              <Input
                id="dv-graph"
                value={graphVersion}
                onChange={(e) => setGraphVersion(e.target.value)}
                placeholder="e.g. v2"
                required
              />
            </Field>
            <Field>
              <Label htmlFor="dv-policy">Selection Policy (JSON)</Label>
              <Textarea
                id="dv-policy"
                value={selectionPolicy}
                onChange={(e) => setSelectionPolicy(e.target.value)}
                placeholder='{"strategy": "random", "count": 100}'
                className="font-mono"
              />
            </Field>
            <Field>
              <Label htmlFor="dv-candidates">Candidate IDs (JSON array)</Label>
              <Textarea
                id="dv-candidates"
                value={candidateIds}
                onChange={(e) => setCandidateIds(e.target.value)}
                placeholder='["uuid-1", "uuid-2"]'
                className="font-mono"
              />
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
