"use client";

import {
  ArrowLeftIcon,
  Loader2Icon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ErrorLogTable } from "@/components/bulk-source/error-log-table";
import { ImportProgress } from "@/components/bulk-source/import-progress";
import { MappingForm } from "@/components/bulk-source/mapping-form";
import { PreviewTable } from "@/components/bulk-source/preview-table";
import { SchemaTable } from "@/components/bulk-source/schema-table";
import { StepIndicator } from "@/components/bulk-source/step-indicator";
import { StateBadge } from "@/components/state-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { useMutation } from "@/hooks/use-mutation";

interface ImportProgressData {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  deduplicated: number;
  startedAt: string | null;
  completedAt: string | null;
}

interface ImportError {
  rowNumber: number;
  column?: string;
  error: string;
  value?: unknown;
}

interface DiscoveredColumn {
  name: string;
  type: string;
  nullable: boolean;
  sampleValues: unknown[];
}

interface SourceSchema {
  format: string;
  rowCount: number;
  columns: DiscoveredColumn[];
  checksum: string;
}

interface BulkSource {
  id: string;
  name: string;
  uri: string;
  format: string | null;
  status: string;
  sourceLabel: string;
  discoveredSchema: SourceSchema | null;
  fieldMapping: Record<string, unknown> | null;
  fileChecksum: string | null;
  rowCount: number | null;
  importProgress: ImportProgressData | null;
  errorLog: ImportError[] | null;
  createdAt: string;
  updatedAt: string;
}

function truncateId(id: string): string {
  return id.slice(0, 8) + "\u2026";
}

const POLL_INTERVAL_MS = 2_000;

export default function BulkSourceDetailPage() {
  const params = useParams<{ id: string }>();
  const {
    data: source,
    isLoading,
    refetch,
  } = useApi<BulkSource>(`/bulk-sources/${params.id}`);

  // Polling for importing state
  const isImporting = source?.status === "importing";
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isImporting) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    pollRef.current = setInterval(() => {
      refetch();
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isImporting, refetch]);

  // Discover mutation
  const [isDiscovering, setIsDiscovering] = useState(false);
  const handleDiscover = useCallback(async () => {
    setIsDiscovering(true);
    try {
      const res = await fetch(`/api/v1/bulk-sources/${params.id}/discover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          (body as { error?: { message?: string } } | null)?.error?.message ??
            "Discovery failed"
        );
      }
      toast.success("Schema discovered");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setIsDiscovering(false);
    }
  }, [params.id, refetch]);

  // Import confirmation
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { mutate: startImport, isPending: isStartingImport } = useMutation(
    "POST",
    `/bulk-sources/${params.id}/import`,
    {
      onSuccess: () => {
        toast.success("Import started");
        setImportDialogOpen(false);
        refetch();
      },
      onError: (err) => {
        if (err.status === 409) {
          toast.error("Import already in progress");
          refetch();
        } else {
          toast.error(err.message);
        }
      },
    }
  );

  // Edit mapping toggle (for mapped state)
  const [editingMapping, setEditingMapping] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!source) {
    return (
      <p className="text-sm text-muted-foreground">Bulk source not found.</p>
    );
  }

  const schema = source.discoveredSchema;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon-sm" asChild>
          <Link href="/bulk-sources">
            <ArrowLeftIcon className="size-4" />
            <span className="sr-only">Back to imports</span>
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">{source.name}</h1>
          <StateBadge state={source.status} />
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator status={source.status} />

      {/* State-dependent content */}
      {source.status === "pending" && (
        <PendingContent
          uri={source.uri}
          isDiscovering={isDiscovering}
          onDiscover={handleDiscover}
        />
      )}

      {source.status === "discovered" && schema && (
        <DiscoveredContent
          schema={schema}
          sourceId={source.id}
          rowCount={source.rowCount}
          fileChecksum={source.fileChecksum}
          onRediscover={handleDiscover}
          isDiscovering={isDiscovering}
          onMappingSaved={refetch}
        />
      )}

      {source.status === "mapped" && schema && (
        <MappedContent
          sourceId={source.id}
          source={source}
          schema={schema}
          editingMapping={editingMapping}
          onEditMapping={() => setEditingMapping(true)}
          onCancelEdit={() => setEditingMapping(false)}
          onMappingSaved={() => {
            setEditingMapping(false);
            refetch();
          }}
          onStartImport={() => setImportDialogOpen(true)}
        />
      )}

      {source.status === "importing" && source.importProgress && (
        <ImportProgress progress={source.importProgress} />
      )}

      {source.status === "completed" && source.importProgress && (
        <CompletedContent progress={source.importProgress} />
      )}

      {source.status === "completed_with_errors" && (
        <CompletedWithErrorsContent
          progress={source.importProgress}
          errorLog={source.errorLog}
          sourceId={source.id}
          onReimport={refetch}
        />
      )}

      {source.status === "failed" && (
        <FailedContent
          errorLog={source.errorLog}
          sourceId={source.id}
          onReimport={refetch}
        />
      )}

      {/* Details card (always visible) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <DetailRow
            label="ID"
            value={<span className="font-mono">{truncateId(source.id)}</span>}
          />
          <Separator />
          <DetailRow
            label="URI"
            value={
              <span className="max-w-80 truncate font-mono">{source.uri}</span>
            }
          />
          <Separator />
          <DetailRow
            label="Format"
            value={source.format?.toUpperCase() ?? "\u2014"}
          />
          <Separator />
          <DetailRow label="Source Label" value={source.sourceLabel} />
          <Separator />
          <DetailRow
            label="File Checksum"
            value={
              <span className="max-w-48 truncate font-mono">
                {source.fileChecksum ?? "\u2014"}
              </span>
            }
          />
          <Separator />
          <DetailRow
            label="Created"
            value={new Date(source.createdAt).toLocaleString()}
          />
          <Separator />
          <DetailRow
            label="Updated"
            value={new Date(source.updatedAt).toLocaleString()}
          />
        </CardContent>
      </Card>

      {/* Import confirmation dialog */}
      <AlertDialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Import {source.rowCount?.toLocaleString() ?? ""} rows from{" "}
              {source.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will create Episodes through the standard pipeline (dedup,
              PII redaction, artifacts). This action cannot be cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isStartingImport}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => startImport({ batch_size: 500 })}
              disabled={isStartingImport}
            >
              {isStartingImport ? "Starting\u2026" : "Start Import"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function PendingContent({
  uri,
  isDiscovering,
  onDiscover,
}: {
  uri: string;
  isDiscovering: boolean;
  onDiscover: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Discover Schema</CardTitle>
        <CardDescription>
          Analyze the file to discover columns, types, and row count.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xs text-muted-foreground">
          File: <span className="font-mono">{uri}</span>
        </div>
        <Button onClick={onDiscover} disabled={isDiscovering}>
          {isDiscovering ? (
            <>
              <Loader2Icon className="mr-2 size-4 animate-spin" />
              Discovering...
            </>
          ) : (
            <>
              <SearchIcon className="mr-2 size-4" />
              Discover Schema
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function DiscoveredContent({
  schema,
  sourceId,
  rowCount,
  fileChecksum,
  onRediscover,
  isDiscovering,
  onMappingSaved,
}: {
  schema: SourceSchema;
  sourceId: string;
  rowCount: number | null;
  fileChecksum: string | null;
  onRediscover: () => void;
  isDiscovering: boolean;
  onMappingSaved: () => void;
}) {
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Discovered Schema</CardTitle>
              <CardDescription>
                {schema.columns.length} columns
                {rowCount !== null
                  ? ` \u00b7 ${rowCount.toLocaleString()} rows`
                  : ""}
                {fileChecksum
                  ? ` \u00b7 checksum: ${fileChecksum.slice(0, 12)}\u2026`
                  : ""}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onRediscover}
              disabled={isDiscovering}
            >
              <RefreshCwIcon className="mr-2 size-3.5" />
              Re-discover
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <SchemaTable columns={schema.columns} />
        </CardContent>
      </Card>

      <MappingForm
        columns={schema.columns}
        sourceId={sourceId}
        onSaved={onMappingSaved}
      />
    </>
  );
}

function MappedContent({
  sourceId,
  source,
  schema,
  editingMapping,
  onEditMapping,
  onCancelEdit,
  onMappingSaved,
  onStartImport,
}: {
  sourceId: string;
  source: BulkSource;
  schema: SourceSchema;
  editingMapping: boolean;
  onEditMapping: () => void;
  onCancelEdit: () => void;
  onMappingSaved: () => void;
  onStartImport: () => void;
}) {
  if (editingMapping) {
    return (
      <MappingForm
        columns={schema.columns}
        sourceId={sourceId}
        existingMapping={source.fieldMapping ?? undefined}
        onSaved={onMappingSaved}
        onCancel={onCancelEdit}
      />
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onEditMapping}>
          Edit Mapping
        </Button>
      </div>

      <PreviewTable sourceId={sourceId} />

      <Button size="lg" onClick={onStartImport}>
        Start Import
      </Button>
    </>
  );
}

function CompletedContent({ progress }: { progress: ImportProgressData }) {
  return (
    <Card className="border-chart-1/30">
      <CardHeader>
        <CardTitle className="text-sm text-chart-1">Import Complete</CardTitle>
      </CardHeader>
      <CardContent className="text-xs">
        <p>
          {progress.succeeded.toLocaleString()} episodes created
          {progress.deduplicated > 0
            ? `, ${progress.deduplicated.toLocaleString()} duplicates skipped`
            : ""}
        </p>
        {progress.completedAt && (
          <p className="mt-1 text-muted-foreground">
            Completed at {new Date(progress.completedAt).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CompletedWithErrorsContent({
  progress,
  errorLog,
  sourceId,
  onReimport,
}: {
  progress: ImportProgressData | null;
  errorLog: ImportError[] | null;
  sourceId: string;
  onReimport: () => void;
}) {
  const { mutate: reimport, isPending } = useMutation(
    "PUT",
    `/bulk-sources/${sourceId}/mapping`,
    {
      onSuccess: () => {
        toast.success("Ready to re-import");
        onReimport();
      },
      onError: (err) => toast.error(err.message),
    }
  );

  return (
    <>
      <Card className="border-chart-4/30">
        <CardHeader>
          <CardTitle className="text-sm text-chart-4">
            Import Completed with Errors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {progress && (
            <p>
              {progress.succeeded.toLocaleString()} succeeded,{" "}
              {progress.failed.toLocaleString()} failed
              {progress.deduplicated > 0
                ? `, ${progress.deduplicated.toLocaleString()} skipped`
                : ""}
            </p>
          )}
        </CardContent>
      </Card>

      {errorLog && errorLog.length > 0 && <ErrorLogTable errors={errorLog} />}
    </>
  );
}

function FailedContent({
  errorLog,
  sourceId,
  onReimport,
}: {
  errorLog: ImportError[] | null;
  sourceId: string;
  onReimport: () => void;
}) {
  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-sm text-destructive">
          Import Failed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {errorLog && errorLog.length > 0 && (
          <p className="text-destructive">
            {errorLog[0]?.error ?? "Unknown error"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
