"use client";

import { PlusIcon, UploadIcon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/use-api";
import { useMutation } from "@/hooks/use-mutation";
import type { PaginatedResponse } from "@/lib/api-client";

interface BulkSource {
  id: string;
  name: string;
  uri: string;
  format: string | null;
  status: string;
  sourceLabel: string;
  rowCount: number | null;
  createdAt: string;
  updatedAt: string;
}

type StatusFilter = "all" | "active" | "completed" | "failed";

const STATUS_FILTER_MAP: Record<StatusFilter, string | undefined> = {
  all: undefined,
  active: "pending,discovered,mapped,importing",
  completed: "completed,completed_with_errors",
  failed: "failed",
};

function truncateName(name: string, max = 40): string {
  return name.length > max ? name.slice(0, max) + "\u2026" : name;
}

function truncateUri(uri: string, max = 50): string {
  return uri.length > max ? uri.slice(0, max) + "\u2026" : uri;
}

const columns: ColumnDef<BulkSource>[] = [
  {
    id: "name",
    header: "Name",
    accessorFn: (row) => truncateName(row.name),
    sortable: true,
  },
  {
    id: "uri",
    header: "URI",
    accessorFn: (row) => (
      <span className="font-mono text-xs">{truncateUri(row.uri)}</span>
    ),
    sortable: true,
  },
  {
    id: "format",
    header: "Format",
    accessorFn: (row) =>
      row.format ? (
        <Badge variant="secondary">{row.format.toUpperCase()}</Badge>
      ) : (
        "\u2014"
      ),
    sortable: true,
  },
  {
    id: "status",
    header: "Status",
    accessorFn: (row) => <StateBadge state={row.status} />,
    sortable: true,
  },
  {
    id: "rowCount",
    header: "Rows",
    accessorFn: (row) =>
      row.rowCount !== null ? row.rowCount.toLocaleString() : "\u2014",
    sortable: true,
  },
  {
    id: "createdAt",
    header: "Created",
    accessorFn: (row) => new Date(row.createdAt).toLocaleDateString(),
    sortable: true,
  },
];

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Failed", value: "failed" },
];

function BulkSourcesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("page_size") ?? "20");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const statusParam = STATUS_FILTER_MAP[statusFilter];
  const queryStr = statusParam
    ? `/bulk-sources?page=${page}&page_size=${pageSize}&status=${statusParam}`
    : `/bulk-sources?page=${page}&page_size=${pageSize}`;

  const { data, isLoading, refetch } =
    useApi<PaginatedResponse<BulkSource>>(queryStr);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [uri, setUri] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sourceLabel, setSourceLabel] = useState("");

  const { mutate: createSource, isPending: isCreating } =
    useMutation<BulkSource>("POST", "/bulk-sources", {
      onSuccess: () => {
        toast.success("Bulk source created");
        setDialogOpen(false);
        resetForm();
        refetch();
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });

  function resetForm() {
    setName("");
    setUri("");
    setSourceLabel("");
    setShowAdvanced(false);
  }

  function handleCreate() {
    if (!name.trim() || !uri.trim()) return;
    createSource({
      name: name.trim(),
      uri: uri.trim(),
      ...(sourceLabel.trim() ? { source_label: sourceLabel.trim() } : {}),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Imports</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon className="mr-2 size-4" />
          New Import
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bulk Sources</CardTitle>
            <div className="flex gap-1">
              {STATUS_FILTERS.map((f) => (
                <Button
                  key={f.value}
                  variant={statusFilter === f.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(f.value)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            isLoading={isLoading}
            onRowClick={(row) => router.push(`/bulk-sources/${row.id}`)}
            emptyState={
              <EmptyState
                icon={UploadIcon}
                title="No imports yet"
                description="Import a dataset file to create episodes in bulk."
                action={{
                  label: "New Import",
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

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Import</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Field>
              <Label>Name</Label>
              <Input
                placeholder="My dataset import"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field>
              <Label>URI</Label>
              <Input
                placeholder="/path/to/data.csv or s3://bucket/file.parquet"
                value={uri}
                onChange={(e) => setUri(e.target.value)}
                className="font-mono"
              />
            </Field>
            {showAdvanced ? (
              <Field>
                <Label>Source Label</Label>
                <Input
                  placeholder="bulk:{id}"
                  value={sourceLabel}
                  onChange={(e) => setSourceLabel(e.target.value)}
                />
              </Field>
            ) : (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowAdvanced(true)}
              >
                Advanced options...
              </button>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || !uri.trim() || isCreating}
            >
              {isCreating ? "Creating\u2026" : "Create Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BulkSourcesPage() {
  return (
    <Suspense>
      <BulkSourcesContent />
    </Suspense>
  );
}
