"use client";

import { DatabaseIcon, PlusIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { DataTable, type ColumnDef } from "@/components/data-table/data-table";
import { Pagination } from "@/components/data-table/pagination";
import { EmptyState } from "@/components/empty-state";
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

const PAGE_SIZE = 20;

const columns: ColumnDef<DatasetSuite>[] = [
  {
    id: "name",
    header: "Name",
    accessorFn: (row) => row.name,
    sortable: true,
  },
  {
    id: "description",
    header: "Description",
    accessorFn: (row) => row.description,
    className: "max-w-xs truncate",
  },
  {
    id: "createdAt",
    header: "Created At",
    accessorFn: (row) => new Date(row.createdAt).toLocaleDateString(),
    sortable: true,
  },
];

function DatasetSuitesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") ?? "1");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data, isLoading, refetch } = useApi<PaginatedResponse<DatasetSuite>>(
    `/dataset-suites?page=${page}&page_size=${PAGE_SIZE}`
  );

  const { mutate, isPending } = useMutation("POST", "/dataset-suites", {
    onSuccess: () => {
      toast.success("Dataset suite created");
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
    setDescription("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate({ name, description });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Dataset Suites</h1>
          <p className="text-xs text-muted-foreground">
            Manage versioned dataset collections
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon className="size-4" />
          Create Suite
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Suites</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            isLoading={isLoading}
            onRowClick={(row) => router.push(`/datasets/${row.id}`)}
            emptyState={
              <EmptyState
                icon={DatabaseIcon}
                title="No dataset suites"
                description="Create your first dataset suite to start organizing versioned datasets."
                action={{
                  label: "Create Suite",
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
            <DialogTitle>Create Dataset Suite</DialogTitle>
            <DialogDescription>
              Add a new dataset suite to organize your versioned datasets.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field>
              <Label htmlFor="ds-name">Name</Label>
              <Input
                id="ds-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Safety Eval Suite"
                required
              />
            </Field>
            <Field>
              <Label htmlFor="ds-desc">Description</Label>
              <Textarea
                id="ds-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this dataset suite..."
                required
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

export default function DatasetSuitesPage() {
  return (
    <Suspense>
      <DatasetSuitesContent />
    </Suspense>
  );
}
