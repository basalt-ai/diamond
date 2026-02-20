"use client";

import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  GitCompareIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VersionDiffData {
  version_a: { id: string; version: string; suite_id: string };
  version_b: { id: string; version: string; suite_id: string };
  added_count: number;
  removed_count: number;
  unchanged_count: number;
  changed_count: number;
  net_delta: number;
  added_candidate_ids: string[];
  removed_candidate_ids: string[];
  changed: Array<{
    candidateId: string;
    previousLabelHash: string;
    currentLabelHash: string;
  }>;
  scenario_breakdown: {
    added: Record<string, number>;
    removed: Record<string, number>;
    changed: Record<string, number>;
  };
}

// Backward-compatible: old format may just be a JSON blob
type DiffResponse = VersionDiffData | { versionA: unknown; versionB: unknown; diff: unknown };

function isEnhancedDiff(d: DiffResponse): d is VersionDiffData {
  return "added_count" in d;
}

function truncateId(id: string): string {
  return id.slice(0, 8) + "\u2026";
}

const MAX_IDS_SHOWN = 50;

// ---------------------------------------------------------------------------
// Diff Form (no params)
// ---------------------------------------------------------------------------

function DiffForm() {
  const router = useRouter();
  const [versionA, setVersionA] = useState("");
  const [versionB, setVersionB] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!versionA.trim() || !versionB.trim()) {
      toast.error("Please provide both version IDs");
      return;
    }
    router.push(
      `/datasets/diff?version_a=${versionA.trim()}&version_b=${versionB.trim()}`
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
        <div>
          <h1 className="text-lg font-semibold">Compare Versions</h1>
          <p className="text-xs text-muted-foreground">
            Select two dataset versions to compare
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Select Versions</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field>
              <Label htmlFor="diff-a">Version A (ID)</Label>
              <Input
                id="diff-a"
                value={versionA}
                onChange={(e) => setVersionA(e.target.value)}
                placeholder="UUID of version A"
                className="font-mono"
                required
              />
            </Field>
            <Field>
              <Label htmlFor="diff-b">Version B (ID)</Label>
              <Input
                id="diff-b"
                value={versionB}
                onChange={(e) => setVersionB(e.target.value)}
                placeholder="UUID of version B"
                className="font-mono"
                required
              />
            </Field>
            <Button type="submit">
              <GitCompareIcon className="size-4" />
              Compare
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible ID list
// ---------------------------------------------------------------------------

function CollapsibleIdList({
  title,
  ids,
  variant,
}: {
  title: string;
  ids: string[];
  variant: "green" | "red";
}) {
  const [open, setOpen] = useState(false);
  const colorClass =
    variant === "green"
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";

  if (ids.length === 0) return null;

  return (
    <div className="border rounded-md">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium hover:bg-muted/50"
      >
        {open ? (
          <ChevronDownIcon className="size-3.5" />
        ) : (
          <ChevronRightIcon className="size-3.5" />
        )}
        <span className={colorClass}>{title}</span>
        <Badge variant="outline" className="ml-auto">
          {ids.length}
        </Badge>
      </button>
      {open && (
        <div className="border-t px-4 py-2">
          <div className="flex flex-wrap gap-1">
            {ids.slice(0, MAX_IDS_SHOWN).map((id) => (
              <code key={id} className="rounded bg-muted px-1 py-0.5 text-[10px]">
                {truncateId(id)}
              </code>
            ))}
            {ids.length > MAX_IDS_SHOWN && (
              <span className="text-[10px] text-muted-foreground">
                ... and {ids.length - MAX_IDS_SHOWN} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Enhanced Diff Viewer
// ---------------------------------------------------------------------------

function DiffViewer({
  versionAId,
  versionBId,
}: {
  versionAId: string;
  versionBId: string;
}) {
  const { data, isLoading, error } = useApi<DiffResponse>(
    `/dataset-versions/${versionAId}/diff/${versionBId}`
  );

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon-sm" asChild>
            <Link href="/datasets">
              <ArrowLeftIcon className="size-4" />
              <span className="sr-only">Back to datasets</span>
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">Compare Versions</h1>
        </div>
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-sm text-muted-foreground">
              Failed to load diff: {error.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const enhanced = isEnhancedDiff(data);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon-sm" asChild>
          <Link href="/datasets">
            <ArrowLeftIcon className="size-4" />
            <span className="sr-only">Back to datasets</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-semibold">
            {enhanced
              ? `${data.version_a.version} vs ${data.version_b.version}`
              : `${truncateId(versionAId)} vs ${truncateId(versionBId)}`}
          </h1>
          <p className="text-xs text-muted-foreground">
            Side-by-side comparison of two dataset versions
          </p>
        </div>
      </div>

      {enhanced ? (
        <>
          {/* Summary badges */}
          <div className="flex flex-wrap gap-3">
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              +{data.added_count} Added
            </Badge>
            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
              -{data.removed_count} Removed
            </Badge>
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              ~{data.changed_count} Changed
            </Badge>
            <Badge variant="outline">
              ={data.unchanged_count} Unchanged
            </Badge>
            <Badge variant="secondary">
              Net: {data.net_delta >= 0 ? "+" : ""}
              {data.net_delta}
            </Badge>
          </div>

          {/* Scenario breakdown */}
          {Object.keys(data.scenario_breakdown.added).length > 0 ||
          Object.keys(data.scenario_breakdown.removed).length > 0 ||
          Object.keys(data.scenario_breakdown.changed).length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Scenario Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-4 py-2 font-medium">Scenario</th>
                      <th className="px-4 py-2 font-medium text-green-600">
                        Added
                      </th>
                      <th className="px-4 py-2 font-medium text-red-600">
                        Removed
                      </th>
                      <th className="px-4 py-2 font-medium text-amber-600">
                        Changed
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const scenarios = new Set([
                        ...Object.keys(data.scenario_breakdown.added),
                        ...Object.keys(data.scenario_breakdown.removed),
                        ...Object.keys(data.scenario_breakdown.changed),
                      ]);
                      return [...scenarios].map((s) => (
                        <tr key={s} className="border-b">
                          <td className="px-4 py-2">{s}</td>
                          <td className="px-4 py-2 text-green-600">
                            {data.scenario_breakdown.added[s] ?? 0}
                          </td>
                          <td className="px-4 py-2 text-red-600">
                            {data.scenario_breakdown.removed[s] ?? 0}
                          </td>
                          <td className="px-4 py-2 text-amber-600">
                            {data.scenario_breakdown.changed[s] ?? 0}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : null}

          {/* Collapsible candidate lists */}
          <div className="space-y-2">
            <CollapsibleIdList
              title="Added Candidates"
              ids={data.added_candidate_ids}
              variant="green"
            />
            <CollapsibleIdList
              title="Removed Candidates"
              ids={data.removed_candidate_ids}
              variant="red"
            />
          </div>
        </>
      ) : (
        // Fallback: old JSON diff format
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Diff</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded bg-muted p-4 text-xs">
              {JSON.stringify(data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function DiffContent() {
  const searchParams = useSearchParams();
  const versionAId = searchParams.get("version_a");
  const versionBId = searchParams.get("version_b");

  if (!versionAId || !versionBId) {
    return <DiffForm />;
  }

  return <DiffViewer versionAId={versionAId} versionBId={versionBId} />;
}

export default function DiffPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <DiffContent />
    </Suspense>
  );
}
