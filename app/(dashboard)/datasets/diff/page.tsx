"use client";

import { ArrowLeftIcon, GitCompareIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { JsonViewer } from "@/components/json-viewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";

interface DiffResponse {
  versionA: unknown;
  versionB: unknown;
  diff: unknown;
}

function truncateId(id: string): string {
  return id.slice(0, 8) + "\u2026";
}

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
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
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
            {truncateId(versionAId)} vs {truncateId(versionBId)}
          </h1>
          <p className="text-xs text-muted-foreground">
            Side-by-side comparison of two dataset versions
          </p>
        </div>
      </div>

      {data?.diff ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Diff</CardTitle>
          </CardHeader>
          <CardContent>
            <JsonViewer data={data.diff} defaultExpanded />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Version A: {truncateId(versionAId)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.versionA ? (
              <JsonViewer data={data.versionA} defaultExpanded />
            ) : (
              <p className="text-xs text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Version B: {truncateId(versionBId)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.versionB ? (
              <JsonViewer data={data.versionB} defaultExpanded />
            ) : (
              <p className="text-xs text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

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
