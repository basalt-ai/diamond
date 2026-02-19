"use client";

import { ArrowLeftIcon, GitCompareIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { JsonViewer } from "@/components/json-viewer";
import { StateBadge } from "@/components/state-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useApi } from "@/hooks/use-api";
import { useMutation } from "@/hooks/use-mutation";
import type { PaginatedResponse } from "@/lib/api-client";

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

type StateAction = "seal" | "release" | "deprecate";

const STATE_TRANSITIONS: Record<
  DatasetVersion["state"],
  { action: StateAction; label: string; description: string } | null
> = {
  draft: {
    action: "seal",
    label: "Seal Version",
    description:
      "This will move the version to validating. It cannot be edited after sealing.",
  },
  validating: {
    action: "release",
    label: "Release Version",
    description:
      "This will release the version for production use. Ensure all gates have passed.",
  },
  released: {
    action: "deprecate",
    label: "Deprecate Version",
    description:
      "This will mark the version as deprecated. It will no longer be used for new evaluations.",
  },
  deprecated: null,
};

function truncateId(id: string): string {
  return id.slice(0, 8) + "\u2026";
}

export default function VersionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareVersionId, setCompareVersionId] = useState("");

  const {
    data: version,
    isLoading,
    refetch,
  } = useApi<DatasetVersion>(`/dataset-versions/${params.id}`);

  // Fetch sibling versions for comparison picker
  const { data: siblingVersions } = useApi<PaginatedResponse<DatasetVersion>>(
    version
      ? `/dataset-versions?page=1&page_size=100&suite_id=${version.suiteId}`
      : null
  );

  const transition = version ? STATE_TRANSITIONS[version.state] : null;

  const { mutate: transitionMutate, isPending: transitionPending } =
    useMutation("POST", `/dataset-versions/${params.id}/state`, {
      onSuccess: () => {
        toast.success("State transition successful");
        setConfirmOpen(false);
        refetch();
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });

  function handleTransition() {
    if (!transition) return;
    transitionMutate({ action: transition.action });
  }

  function handleCompare() {
    if (!compareVersionId.trim()) {
      toast.error("Please enter a version ID to compare with");
      return;
    }
    setCompareOpen(false);
    router.push(
      `/datasets/diff?version_a=${params.id}&version_b=${compareVersionId.trim()}`
    );
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

  if (!version) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          Dataset version not found.
        </p>
      </div>
    );
  }

  const otherVersions = (siblingVersions?.data ?? []).filter(
    (v) => v.id !== version.id
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon-sm" asChild>
          <Link href={`/datasets/${version.suiteId}`}>
            <ArrowLeftIcon className="size-4" />
            <span className="sr-only">Back to suite</span>
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Version {version.version}</h1>
            <StateBadge state={version.state} />
          </div>
          <p className="text-xs text-muted-foreground">
            Suite:{" "}
            <Link
              href={`/datasets/${version.suiteId}`}
              className="underline underline-offset-4 hover:text-primary"
            >
              {truncateId(version.suiteId)}
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCompareOpen(true)}>
            <GitCompareIcon className="size-4" />
            Compare with...
          </Button>
          {transition ? (
            <Button
              variant={
                transition.action === "deprecate" ? "destructive" : "default"
              }
              onClick={() => setConfirmOpen(true)}
              disabled={transitionPending}
            >
              {transitionPending ? "Processing..." : transition.label}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID</span>
              <span className="font-mono">{version.id}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Graph Version</span>
              <span>{version.scenarioGraphVersion}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Candidates</span>
              <span>{version.candidateIds.length}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(version.createdAt).toLocaleDateString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Released</span>
              <span>
                {version.releasedAt
                  ? new Date(version.releasedAt).toLocaleDateString()
                  : "\u2014"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Diagnostics ID</span>
              <span className="font-mono">
                {version.diagnosticsId
                  ? truncateId(version.diagnosticsId)
                  : "\u2014"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Selection Policy</CardTitle>
            <CardDescription>
              Policy used to select candidates for this version
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(version.selectionPolicy).length > 0 ? (
              <JsonViewer data={version.selectionPolicy} defaultExpanded />
            ) : (
              <p className="text-xs text-muted-foreground">
                No selection policy
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Gate Results</CardTitle>
            <CardDescription>Quality gate evaluation results</CardDescription>
          </CardHeader>
          <CardContent>
            {version.gateResults ? (
              <JsonViewer data={version.gateResults} defaultExpanded />
            ) : (
              <p className="text-xs text-muted-foreground">
                No gate results available
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lineage</CardTitle>
            <CardDescription>
              Version provenance and derivation chain
            </CardDescription>
          </CardHeader>
          <CardContent>
            {version.lineage ? (
              <JsonViewer data={version.lineage} defaultExpanded />
            ) : (
              <p className="text-xs text-muted-foreground">
                No lineage data available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {transition ? (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={transition.label}
          description={transition.description}
          confirmLabel={transition.label}
          onConfirm={handleTransition}
          variant={
            transition.action === "deprecate" ? "destructive" : "default"
          }
        />
      ) : null}

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compare Versions</DialogTitle>
            <DialogDescription>
              Select another version to compare with version {version.version}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {otherVersions.length > 0 ? (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Select a version
                </Label>
                <div className="flex flex-col gap-1">
                  {otherVersions.map((v) => (
                    <Button
                      key={v.id}
                      variant={
                        compareVersionId === v.id ? "default" : "outline"
                      }
                      size="sm"
                      className="justify-between"
                      onClick={() => setCompareVersionId(v.id)}
                    >
                      <span>{v.version}</span>
                      <StateBadge state={v.state} />
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
            <Field>
              <Label htmlFor="compare-id">Or enter a Version ID</Label>
              <Input
                id="compare-id"
                value={compareVersionId}
                onChange={(e) => setCompareVersionId(e.target.value)}
                placeholder="Version UUID"
                className="font-mono"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompareOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompare} disabled={!compareVersionId.trim()}>
              Compare
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
