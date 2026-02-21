"use client";

import {
  ArrowLeftIcon,
  LayersIcon,
  LockIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  RefreshCwIcon,
  ShieldIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable, type ColumnDef } from "@/components/data-table/data-table";
import { Pagination } from "@/components/data-table/pagination";
import { EmptyState } from "@/components/empty-state";
import { StateBadge } from "@/components/state-badge";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { useMutation } from "@/hooks/use-mutation";
import { api, type PaginatedResponse } from "@/lib/api-client";

interface DatasetSuite {
  id: string;
  name: string;
  description: string;
  scenarioTypeId: string;
  createdAt: string;
  updatedAt: string;
}

interface RefreshPolicyData {
  enabled: boolean;
  minCandidateCount: number;
  minCoveragePercent: number;
  versionBumpRule: string;
  cooldownMinutes: number;
  exportFormats: string[];
}

interface RefreshRunData {
  id: string;
  suiteId: string;
  triggeredBy: string;
  triggerEventId: string;
  status: string;
  scenarioChanges: unknown[];
  candidateCount: number;
  datasetVersionId: string | null;
  failureReason: string | null;
  startedAt: string;
  completedAt: string | null;
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
  } = useApi<GatePolicy[]>(`/dataset-suites/${suiteId}/release-gate-policies`);

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
    api
      .put(path, { enabled: !p.enabled })
      .then(() => {
        toast.success(`Policy ${!p.enabled ? "enabled" : "disabled"}`);
        refetch();
      })
      .catch(() => toast.error("Failed to toggle policy"));
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

// ---------------------------------------------------------------------------
// Refresh Policy
// ---------------------------------------------------------------------------

const VERSION_BUMP_OPTIONS = ["auto", "minor", "patch"];
const EXPORT_FORMAT_OPTIONS = ["jsonl", "cobalt", "limestone"];

function RefreshPolicySection({
  suiteId,
  onRefreshTriggered,
}: {
  suiteId: string;
  onRefreshTriggered: () => void;
}) {
  const {
    data: policy,
    isLoading,
    refetch,
  } = useApi<RefreshPolicyData | null>(
    `/dataset-suites/${suiteId}/refresh-policy`
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Form state
  const [rpEnabled, setRpEnabled] = useState(true);
  const [rpMinCandidates, setRpMinCandidates] = useState("10");
  const [rpCooldown, setRpCooldown] = useState("60");
  const [rpBumpRule, setRpBumpRule] = useState("auto");
  const [rpCoverage, setRpCoverage] = useState("0");
  const [rpExportFormats, setRpExportFormats] = useState<string[]>([]);

  const { mutate: savePolicy, isPending: savePending } = useMutation(
    "PUT",
    `/dataset-suites/${suiteId}/refresh-policy`,
    {
      onSuccess: () => {
        toast.success("Refresh policy saved");
        closeDialog();
        refetch();
      },
      onError: (err) => toast.error(err.message),
    }
  );

  const [triggerPending, setTriggerPending] = useState(false);

  function closeDialog() {
    setDialogOpen(false);
    setRpEnabled(true);
    setRpMinCandidates("10");
    setRpCooldown("60");
    setRpBumpRule("auto");
    setRpCoverage("0");
    setRpExportFormats([]);
  }

  function openEdit() {
    if (policy) {
      setRpEnabled(policy.enabled);
      setRpMinCandidates(String(policy.minCandidateCount));
      setRpCooldown(String(policy.cooldownMinutes));
      setRpBumpRule(policy.versionBumpRule);
      setRpCoverage(String(policy.minCoveragePercent));
      setRpExportFormats(policy.exportFormats);
    }
    setDialogOpen(true);
  }

  function handleToggleEnabled() {
    if (!policy) return;
    api
      .put(`/dataset-suites/${suiteId}/refresh-policy`, {
        ...policy,
        enabled: !policy.enabled,
      })
      .then(() => {
        toast.success(
          `Auto-refresh ${!policy.enabled ? "enabled" : "disabled"}`
        );
        refetch();
      })
      .catch(() => toast.error("Failed to toggle auto-refresh"));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    savePolicy({
      enabled: rpEnabled,
      minCandidateCount: Number(rpMinCandidates),
      minCoveragePercent: Number(rpCoverage),
      versionBumpRule: rpBumpRule,
      cooldownMinutes: Number(rpCooldown),
      exportFormats: rpExportFormats,
    });
  }

  function handleDelete() {
    api
      .del(`/dataset-suites/${suiteId}/refresh-policy`)
      .then(() => {
        toast.success("Refresh policy removed");
        setDeleteOpen(false);
        refetch();
      })
      .catch(() => toast.error("Failed to remove refresh policy"));
  }

  function toggleExportFormat(fmt: string) {
    setRpExportFormats((prev) =>
      prev.includes(fmt) ? prev.filter((f) => f !== fmt) : [...prev, fmt]
    );
  }

  async function handleTriggerRefresh() {
    setTriggerPending(true);
    try {
      const run = await api.post<RefreshRunData>(
        `/dataset-suites/${suiteId}/refresh-runs`,
        { triggeredBy: "manual", triggerEventId: crypto.randomUUID() }
      );
      if (run.status === "failed" && run.failureReason) {
        const messages: Record<string, string> = {
          not_ready: "Not enough eligible candidates to create a version.",
          draft_exists: "A draft or validating version already exists.",
          cooldown: "Cooldown is active. Try again later.",
          disabled: "Auto-refresh is not enabled.",
        };
        toast.error(
          messages[run.failureReason] ?? `Refresh failed: ${run.failureReason}`
        );
      } else {
        toast.success("Refresh run started — new draft version created");
      }
      onRefreshTriggered();
      refetch();
    } catch {
      toast.error("Failed to trigger refresh");
    } finally {
      setTriggerPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Auto-Refresh Policy</h2>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleTriggerRefresh}
            disabled={!policy?.enabled || triggerPending}
            title={
              !policy
                ? "Configure a refresh policy first"
                : !policy.enabled
                  ? "Enable the refresh policy first"
                  : "Trigger a manual refresh"
            }
          >
            <PlayIcon className="size-4" />
            {triggerPending ? "Triggering..." : "Trigger Refresh"}
          </Button>
          {!policy ? (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <PlusIcon className="size-4" />
              Configure
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={openEdit}>
              <PencilIcon className="size-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !policy ? (
        <EmptyState
          icon={RefreshCwIcon}
          title="No refresh policy"
          description="Configure auto-refresh to automatically create dataset versions when new candidates are available."
          action={{
            label: "Configure",
            onClick: () => setDialogOpen(true),
          }}
        />
      ) : (
        <Card>
          <CardContent className="space-y-3 pt-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <div className="flex items-center gap-2">
                <Badge variant={policy.enabled ? "default" : "secondary"}>
                  {policy.enabled ? "Enabled" : "Disabled"}
                </Badge>
                <button
                  type="button"
                  onClick={handleToggleEnabled}
                  className={`size-3.5 rounded-full border-2 ${
                    policy.enabled
                      ? "border-green-500 bg-green-500"
                      : "border-muted-foreground bg-transparent"
                  }`}
                  title={policy.enabled ? "Disable" : "Enable"}
                />
              </div>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Min Candidates</span>
              <span>{policy.minCandidateCount}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cooldown</span>
              <span>{policy.cooldownMinutes} min</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version Bump</span>
              <span>{policy.versionBumpRule}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Min Coverage</span>
              <span>{policy.minCoveragePercent}%</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Export Formats</span>
              <span>
                {policy.exportFormats.length > 0
                  ? policy.exportFormats.join(", ")
                  : "\u2014"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2Icon className="size-3.5" />
                Remove Policy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {policy ? "Edit Refresh Policy" : "Configure Refresh Policy"}
            </DialogTitle>
            <DialogDescription>
              Set conditions for automatic dataset version creation.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={rpEnabled}
                  onChange={(e) => setRpEnabled(e.target.checked)}
                  className="size-3.5 rounded border"
                />
                Enabled
              </label>
            </div>
            <Field>
              <Label htmlFor="rp-min-candidates">Min Candidate Count</Label>
              <Input
                id="rp-min-candidates"
                type="number"
                min={1}
                value={rpMinCandidates}
                onChange={(e) => setRpMinCandidates(e.target.value)}
                required
              />
            </Field>
            <Field>
              <Label htmlFor="rp-cooldown">Cooldown (minutes)</Label>
              <Input
                id="rp-cooldown"
                type="number"
                min={0}
                value={rpCooldown}
                onChange={(e) => setRpCooldown(e.target.value)}
                required
              />
            </Field>
            <Field>
              <Label>Version Bump Rule</Label>
              <Select value={rpBumpRule} onValueChange={setRpBumpRule}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VERSION_BUMP_OPTIONS.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <Label htmlFor="rp-coverage">Min Coverage (%)</Label>
              <Input
                id="rp-coverage"
                type="number"
                min={0}
                max={100}
                value={rpCoverage}
                onChange={(e) => setRpCoverage(e.target.value)}
                required
              />
            </Field>
            <Field>
              <Label>Export Formats</Label>
              <div className="flex items-center gap-4">
                {EXPORT_FORMAT_OPTIONS.map((fmt) => (
                  <label key={fmt} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={rpExportFormats.includes(fmt)}
                      onChange={() => toggleExportFormat(fmt)}
                      className="size-3.5 rounded border"
                    />
                    {fmt}
                  </label>
                ))}
              </div>
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={savePending}>
                {savePending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Remove Refresh Policy"
        description="This will remove the auto-refresh configuration. You can reconfigure it later."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Refresh Runs
// ---------------------------------------------------------------------------

const FAILURE_REASON_LABELS: Record<string, string> = {
  not_ready: "Not enough candidates",
  draft_exists: "Draft already exists",
  cooldown: "Cooldown active",
  disabled: "Policy disabled",
};

function RefreshRunsSection({ suiteId }: { suiteId: string }) {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useApi<PaginatedResponse<RefreshRunData>>(
    `/dataset-suites/${suiteId}/refresh-runs?page=${page}&page_size=10`
  );

  const router = useRouter();

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold">Refresh Runs</h2>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !data?.data || data.data.length === 0 ? (
        <EmptyState
          icon={RefreshCwIcon}
          title="No refresh runs"
          description="Trigger a manual refresh to create a dataset version from this scenario's candidates."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-2 font-medium">Trigger</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Detail</th>
                  <th className="px-4 py-2 font-medium">Candidates</th>
                  <th className="px-4 py-2 font-medium">Version</th>
                  <th className="px-4 py-2 font-medium">Started</th>
                  <th className="px-4 py-2 font-medium">Completed</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((run) => (
                  <tr key={run.id} className="border-b">
                    <td className="px-4 py-2">
                      <Badge variant="secondary">{run.triggeredBy}</Badge>
                    </td>
                    <td className="px-4 py-2">
                      <StateBadge state={run.status} />
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {run.status === "failed" && run.failureReason
                        ? (FAILURE_REASON_LABELS[run.failureReason] ??
                          run.failureReason)
                        : "\u2014"}
                    </td>
                    <td className="px-4 py-2">{run.candidateCount}</td>
                    <td className="px-4 py-2">
                      {run.datasetVersionId ? (
                        <button
                          type="button"
                          className="text-blue-500 hover:underline"
                          onClick={() =>
                            router.push(
                              `/datasets/versions/${run.datasetVersionId}`
                            )
                          }
                        >
                          {run.datasetVersionId.slice(0, 8)}&hellip;
                        </button>
                      ) : (
                        "\u2014"
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {new Date(run.startedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      {run.completedAt
                        ? new Date(run.completedAt).toLocaleString()
                        : "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      {data?.pagination && data.pagination.totalPages > 1 ? (
        <Pagination
          total={data.pagination.total}
          page={data.pagination.page}
          pageSize={data.pagination.pageSize}
        />
      ) : null}
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

  const { data: scenarioType } = useApi<{ id: string; name: string }>(
    suite ? `/scenario-types/${suite.scenarioTypeId}` : null
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
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{suite.name}</h1>
            {scenarioType && (
              <Badge variant="secondary">{scenarioType.name}</Badge>
            )}
          </div>
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

      <RefreshPolicySection suiteId={params.id} onRefreshTriggered={refetch} />

      <RefreshRunsSection suiteId={params.id} />

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
