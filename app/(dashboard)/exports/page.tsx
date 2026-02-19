"use client";

import { DownloadIcon, FileIcon, PlusIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApi } from "@/hooks/use-api";
import { useMutation } from "@/hooks/use-mutation";
import type { PaginatedResponse } from "@/lib/api-client";

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

interface DatasetVersion {
  id: string;
  name?: string;
  version?: number;
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

const columns: ColumnDef<ExportJob>[] = [
  {
    id: "format",
    header: "Format",
    accessorFn: (row) => (
      <Badge variant="secondary">{row.format.toUpperCase()}</Badge>
    ),
    sortable: true,
  },
  {
    id: "datasetVersionId",
    header: "Dataset Version",
    accessorFn: (row) => truncateId(row.datasetVersionId),
    sortable: true,
  },
  {
    id: "state",
    header: "State",
    accessorFn: (row) => <StateBadge state={row.state} />,
    sortable: true,
  },
  {
    id: "rowCount",
    header: "Row Count",
    accessorFn: (row) =>
      row.rowCount !== null ? row.rowCount.toLocaleString() : "\u2014",
    sortable: true,
  },
  {
    id: "size",
    header: "Size",
    accessorFn: (row) => formatSize(row.artifactSizeBytes),
    sortable: true,
  },
  {
    id: "createdAt",
    header: "Created",
    accessorFn: (row) => new Date(row.createdAt).toLocaleDateString(),
    sortable: true,
  },
];

const FORMATS = ["jsonl", "csv", "parquet"] as const;

function ExportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("page_size") ?? "20");

  const { data, isLoading, refetch } = useApi<PaginatedResponse<ExportJob>>(
    `/exports?page=${page}&page_size=${pageSize}`
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<string>("");

  const { data: versionsData } = useApi<PaginatedResponse<DatasetVersion>>(
    dialogOpen ? "/dataset-versions?page=1&page_size=100" : null
  );

  const { mutate: createExport, isPending: isCreating } = useMutation(
    "POST",
    "/exports",
    {
      onSuccess: () => {
        toast.success("Export triggered successfully");
        setDialogOpen(false);
        setSelectedVersionId("");
        setSelectedFormat("");
        refetch();
      },
      onError: (err) => {
        toast.error(err.message);
      },
    }
  );

  function handleCreate() {
    if (!selectedVersionId || !selectedFormat) return;
    createExport({
      dataset_version_id: selectedVersionId,
      format: selectedFormat,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Exports</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon className="mr-2 size-4" />
          Trigger Export
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Exports</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            isLoading={isLoading}
            onRowClick={(row) => router.push(`/exports/${row.id}`)}
            emptyState={
              <EmptyState
                icon={FileIcon}
                title="No exports yet"
                description="Trigger an export to generate dataset files for download."
                action={{
                  label: "Trigger Export",
                  onClick: () => setDialogOpen(true),
                }}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trigger Export</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Field>
              <Label>Dataset Version</Label>
              <Select
                value={selectedVersionId}
                onValueChange={setSelectedVersionId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a dataset version" />
                </SelectTrigger>
                <SelectContent>
                  {(versionsData?.data ?? []).map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name ? `${v.name} (v${v.version})` : truncateId(v.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <Label>Format</Label>
              <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                <SelectTrigger>
                  <SelectValue placeholder="Select export format" />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!selectedVersionId || !selectedFormat || isCreating}
            >
              {isCreating ? "Creating\u2026" : "Create Export"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ExportsPage() {
  return (
    <Suspense>
      <ExportsContent />
    </Suspense>
  );
}
