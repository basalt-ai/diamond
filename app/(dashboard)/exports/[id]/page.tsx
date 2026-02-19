"use client";

import { ArrowLeftIcon, DownloadIcon, RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { JsonViewer } from "@/components/json-viewer";
import { StateBadge } from "@/components/state-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";

interface ExportJob {
  id: string;
  datasetVersionId: string;
  format: string;
  state: "pending" | "processing" | "completed" | "failed";
  artifactPath: string | null;
  artifactSizeBytes: number | null;
  artifactChecksum: string | null;
  rowCount: number | null;
  metadata: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

function truncateId(id: string): string {
  return id.slice(0, 8) + "\u2026";
}

function formatSize(bytes: number | null): string {
  if (bytes === null) return "\u2014";
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }
  return (bytes / 1024).toFixed(1) + " KB";
}

const AUTO_REFRESH_DURATION_MS = 30_000;
const AUTO_REFRESH_INTERVAL_MS = 2_000;

export default function ExportDetailPage() {
  const params = useParams<{ id: string }>();
  const {
    data: exportJob,
    isLoading,
    refetch,
  } = useApi<ExportJob>(`/exports/${params.id}`);

  const [autoRefreshActive, setAutoRefreshActive] = useState(true);
  const autoRefreshStartRef = useRef<number>(Date.now());

  const isInProgress =
    exportJob?.state === "pending" || exportJob?.state === "processing";

  const stopAutoRefresh = useCallback(() => {
    setAutoRefreshActive(false);
  }, []);

  useEffect(() => {
    if (!isInProgress || !autoRefreshActive) return;

    autoRefreshStartRef.current = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - autoRefreshStartRef.current;
      if (elapsed >= AUTO_REFRESH_DURATION_MS) {
        stopAutoRefresh();
        return;
      }
      refetch();
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isInProgress, autoRefreshActive, refetch, stopAutoRefresh]);

  // Stop auto-refresh once job is no longer in progress
  useEffect(() => {
    if (!isInProgress && exportJob) {
      setAutoRefreshActive(false);
    }
  }, [isInProgress, exportJob]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!exportJob) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Export job not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon-sm" asChild>
          <Link href="/exports">
            <ArrowLeftIcon className="size-4" />
            <span className="sr-only">Back to exports</span>
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Export Detail</h1>
          <Badge variant="secondary">{exportJob.format.toUpperCase()}</Badge>
          <StateBadge state={exportJob.state} />
        </div>
      </div>

      {/* Progress / Status Section */}
      {isInProgress ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Processing</CardTitle>
            <CardDescription>
              This export is currently being processed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={undefined} className="w-full" />
            <div className="flex items-center gap-2">
              {autoRefreshActive ? (
                <p className="text-xs text-muted-foreground">
                  Auto-refreshing every 2 seconds...
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Auto-refresh stopped.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      refetch();
                      setAutoRefreshActive(true);
                    }}
                  >
                    <RefreshCwIcon className="mr-2 size-3.5" />
                    Refresh
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Download Section */}
      {exportJob.state === "completed" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Download</CardTitle>
            <CardDescription>
              Your export is ready for download.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href={`/api/v1/exports/${exportJob.id}/download`}>
                <DownloadIcon className="mr-2 size-4" />
                Download {exportJob.format.toUpperCase()} File
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Error Section */}
      {exportJob.state === "failed" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="destructive">
              {exportJob.errorMessage ?? "Unknown error"}
            </Badge>
          </CardContent>
        </Card>
      ) : null}

      {/* Info Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID</span>
              <span className="font-mono">{exportJob.id}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dataset Version</span>
              <span className="font-mono">
                {truncateId(exportJob.datasetVersionId)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Format</span>
              <span>{exportJob.format.toUpperCase()}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Row Count</span>
              <span>
                {exportJob.rowCount !== null
                  ? exportJob.rowCount.toLocaleString()
                  : "\u2014"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Artifact Size</span>
              <span>{formatSize(exportJob.artifactSizeBytes)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Checksum</span>
              <span className="max-w-48 truncate font-mono">
                {exportJob.artifactChecksum ?? "\u2014"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(exportJob.createdAt).toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Updated</span>
              <span>{new Date(exportJob.updatedAt).toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed</span>
              <span>
                {exportJob.completedAt
                  ? new Date(exportJob.completedAt).toLocaleString()
                  : "\u2014"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Metadata</CardTitle>
          <CardDescription>
            Additional metadata for this export job
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(exportJob.metadata).length > 0 ? (
            <JsonViewer data={exportJob.metadata} defaultExpanded />
          ) : (
            <p className="text-xs text-muted-foreground">No metadata</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
