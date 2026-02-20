"use client";

import {
  ArrowLeftIcon,
  LayersIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  ShieldIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { DataTable, type ColumnDef } from "@/components/data-table/data-table";
import { Pagination } from "@/components/data-table/pagination";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { useMutation } from "@/hooks/use-mutation";
import { api, type PaginatedResponse } from "@/lib/api-client";

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

// ---------------------------------------------------------------------------
// Gate Policies
// ---------------------------------------------------------------------------

interface GatePolicy {
  id: string;
  suiteId: string;
  gateName: string;
  metric: string;
  threshold: number;
  comparison: string;
  scope: string;
  sliceFilter: Record<string, unknown> | null;
  blocking: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

const METRIC_OPTIONS = [
  "agreement",
  "redundancy",
  "coverage",
  "drift",
  "entropy",
  "leakage",
];
const COMPARISON_OPTIONS = [
  { value: "gte", label: "\u2265 (gte)" },
  { value: "lte", label: "\u2264 (lte)" },
];
const SCOPE_OPTIONS = ["overall", "per_scenario", "per_slice"];

function GatePoliciesSection({ suiteId }: { suiteId: string }) {
  const {
    data: policies,
    isLoading,
    refetch,
  } = useApi<GatePolicy[]>(
    `/dataset-suites/${suiteId}/release-gate-policies`
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<GatePolicy | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GatePolicy | null>(null);

  // Form state
  const [gateName, setGateName] = useState("");
  const [metric, setMetric] = useState("agreement");
  const [threshold, setThreshold] = useState("");
  const [comparison, setComparison] = useState("gte");
  const [scope, setScope] = useState("overall");
  const [sliceFilter, setSliceFilter] = useState("");
  const [blocking, setBlocking] = useState(true);
  const [enabled, setEnabled] = useState(true);

  const { mutate: createPolicy, isPending: createPending } = useMutation(
    "POST",
    `/dataset-suites/${suiteId}/release-gate-policies`,
    {
      onSuccess: () => {
        toast.success("Gate policy created");
        closeDialog();
        refetch();
      },
      onError: (err) => toast.error(err.message),
    }
  );

  const { mutate: updatePolicy, isPending: updatePending } = useMutation(
    "PUT",
    editingPolicy
      ? `/dataset-suites/${suiteId}/release-gate-policies/${editingPolicy.id}`
      : "/noop",
    {
      onSuccess: () => {
        toast.success("Gate policy updated");
        closeDialog();
        refetch();
      },
      onError: (err) => toast.error(err.message),
    }
  );

  const { mutate: deletePolicy } = useMutation(
    "DELETE",
    deleteTarget
      ? `/dataset-suites/${suiteId}/release-gate-policies/${deleteTarget.id}`
      : "/noop",
    {
      onSuccess: () => {
        toast.success("Gate policy deleted");
        setDeleteTarget(null);
        refetch();
      },
      onError: (err) => toast.error(err.message),
    }
  );

  function closeDialog() {
    setDialogOpen(false);
    setEditingPolicy(null);
    setGateName("");
    setMetric("agreement");
    setThreshold("");
    setComparison("gte");
    setScope("overall");
    setSliceFilter("");
    setBlocking(true);
    setEnabled(true);
  }

  function openEdit(p: GatePolicy) {
    setEditingPolicy(p);
    setGateName(p.gateName);
    setMetric(p.metric);
    setThreshold(String(p.threshold));
    setComparison(p.comparison);
    setScope(p.scope);
    setSliceFilter(p.sliceFilter ? JSON.stringify(p.sliceFilter) : "");
    setBlocking(p.blocking);
    setEnabled(p.enabled);
    setDialogOpen(true);
  }

  function handleToggleEnabled(p: GatePolicy) {
    // Inline toggle via PUT
    const path = `/dataset-suites/${suiteId}/release-gate-policies/${p.id}`;
    api.put(path, { enabled: !p.enabled }).then(() => {
      toast.success(`Policy ${!p.enabled ? "enabled" : "disabled"}`);
      refetch();
    }).catch(() => toast.error("Failed to toggle policy"));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(threshold);
    if (Number.isNaN(parsed)) {
      toast.error("Threshold must be a number");
      return;
    }

    let parsedFilter: Record<string, unknown> | undefined;
    if (sliceFilter.trim()) {
      try {
        parsedFilter = JSON.parse(sliceFilter) as Record<string, unknown>;
      } catch {
        toast.error("Invalid JSON in slice filter");
        return;
      }
    }

    const body = {
      gateName,
      metric,
      threshold: parsed,
      comparison,
      scope,
      sliceFilter: parsedFilter,
      blocking,
      enabled,
    };

    if (editingPolicy) {
      updatePolicy(body);
    } else {
      createPolicy(body);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Release Gate Policies</h2>
        <Button
          size="sm"
          onClick={() => {
            setEditingPolicy(null);
            setDialogOpen(true);
          }}
        >
          <PlusIcon className="size-4" />
          Add Policy
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !policies || policies.length === 0 ? (
        <EmptyState
          icon={ShieldIcon}
          title="No gate policies"
          description="Add policies to control release quality."
          action={{
            label: "Add Policy",
            onClick: () => setDialogOpen(true),
          }}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-2 font-medium">Gate Name</th>
                  <th className="px-4 py-2 font-medium">Metric</th>
                  <th className="px-4 py-2 font-medium">Comparison</th>
                  <th className="px-4 py-2 font-medium">Threshold</th>
                  <th className="px-4 py-2 font-medium">Scope</th>
                  <th className="px-4 py-2 font-medium">Blocking</th>
                  <th className="px-4 py-2 font-medium">Enabled</th>
                  <th className="px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="px-4 py-2 font-medium">{p.gateName}</td>
                    <td className="px-4 py-2">
                      <Badge variant="secondary">{p.metric}</Badge>
                    </td>
                    <td className="px-4 py-2">
                      {p.comparison === "gte" ? "\u2265" : "\u2264"}
                    </td>
                    <td className="px-4 py-2 font-mono">{p.threshold}</td>
                    <td className="px-4 py-2">{p.scope}</td>
                    <td className="px-4 py-2">
                      {p.blocking ? (
                        <LockIcon className="size-3.5 text-muted-foreground" />
                      ) : (
                        "\u2014"
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(p)}
                        className={`size-3.5 rounded-full border-2 ${
                          p.enabled
                            ? "border-green-500 bg-green-500"
                            : "border-muted-foreground bg-transparent"
                        }`}
                        title={p.enabled ? "Disable" : "Enable"}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(p)}
                        >
                          <PencilIcon className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteTarget(p)}
                        >
                          <Trash2Icon className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPolicy ? "Edit Gate Policy" : "Add Gate Policy"}
            </DialogTitle>
            <DialogDescription>
              {editingPolicy
                ? "Update the gate policy configuration."
                : "Configure a new release gate policy."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field>
              <Label htmlFor="gp-name">Gate Name</Label>
              <Input
                id="gp-name"
                value={gateName}
                onChange={(e) => setGateName(e.target.value)}
                placeholder="e.g. Min Agreement"
                required
              />
            </Field>
            <Field>
              <Label>Metric</Label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METRIC_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <Label htmlFor="gp-threshold">Threshold</Label>
              <Input
                id="gp-threshold"
                type="number"
                step="any"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                required
              />
            </Field>
            <Field>
              <Label>Comparison</Label>
              <Select value={comparison} onValueChange={setComparison}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPARISON_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <Label>Scope</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {scope === "per_slice" && (
              <Field>
                <Label htmlFor="gp-filter">Slice Filter (JSON)</Label>
                <Textarea
                  id="gp-filter"
                  value={sliceFilter}
                  onChange={(e) => setSliceFilter(e.target.value)}
                  placeholder='{"sliceNames": ["slice-a"]}'
                  className="font-mono"
                />
              </Field>
            )}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={blocking}
                  onChange={(e) => setBlocking(e.target.checked)}
                  className="size-3.5 rounded border"
                />
                Blocking
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="size-3.5 rounded border"
                />
                Enabled
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPending || updatePending}>
                {createPending || updatePending
                  ? "Saving..."
                  : editingPolicy
                    ? "Update"
                    : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Delete Gate Policy"
          description="This will permanently remove this gate policy."
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => deletePolicy()}
        />
      )}
    </div>
  );
}

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

      <GatePoliciesSection suiteId={params.id} />

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
