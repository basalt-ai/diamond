"use client";

import { FolderTreeIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { DataTable, type ColumnDef } from "@/components/data-table/data-table";
import { Pagination } from "@/components/data-table/pagination";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { useMutation } from "@/hooks/use-mutation";
import { type PaginatedResponse } from "@/lib/api-client";

interface ScenarioType {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

const PAGE_SIZE = 20;

const columns: ColumnDef<ScenarioType>[] = [
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
    id: "parent",
    header: "Parent",
    accessorFn: (row) => row.parentId ?? "--",
  },
  {
    id: "created",
    header: "Created",
    accessorFn: (row) => new Date(row.createdAt).toLocaleDateString(),
    sortable: true,
  },
];

function ScenariosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") ?? "1");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [metadata, setMetadata] = useState("");

  const { data, isLoading, refetch } = useApi<PaginatedResponse<ScenarioType>>(
    `/scenario-types?page=${page}&page_size=${PAGE_SIZE}`
  );

  const { mutate, isPending } = useMutation("POST", "/scenario-types", {
    onSuccess: () => {
      toast.success("Scenario type created");
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
    setParentId("");
    setMetadata("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let parsedMetadata: Record<string, unknown> | undefined;
    if (metadata.trim()) {
      try {
        parsedMetadata = JSON.parse(metadata) as Record<string, unknown>;
      } catch {
        toast.error("Invalid JSON in metadata field");
        return;
      }
    }

    mutate({
      name,
      description,
      parent_id: parentId || undefined,
      metadata: parsedMetadata,
    });
  }

  // Fetch all types for parent selector
  const { data: allTypes } = useApi<PaginatedResponse<ScenarioType>>(
    "/scenario-types?page=1&page_size=100"
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Scenario Types</h1>
          <p className="text-xs text-muted-foreground">
            Manage your scenario type taxonomy
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon className="size-4" />
          Create Type
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        onRowClick={(row) => router.push(`/scenarios/${row.id}`)}
        emptyState={
          <EmptyState
            icon={FolderTreeIcon}
            title="No scenario types"
            description="Create your first scenario type to start building your taxonomy."
            action={{
              label: "Create Scenario Type",
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Scenario Type</DialogTitle>
            <DialogDescription>
              Add a new scenario type to the taxonomy.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field>
              <Label htmlFor="st-name">Name</Label>
              <Input
                id="st-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Persuasion"
                required
              />
            </Field>
            <Field>
              <Label htmlFor="st-desc">Description</Label>
              <Textarea
                id="st-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this scenario type..."
                required
              />
            </Field>
            <Field>
              <Label>Parent Type</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None (root level)" />
                </SelectTrigger>
                <SelectContent>
                  {(allTypes?.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <Label htmlFor="st-meta">Metadata (JSON)</Label>
              <Textarea
                id="st-meta"
                value={metadata}
                onChange={(e) => setMetadata(e.target.value)}
                placeholder='{"key": "value"}'
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

export default function ScenariosPage() {
  return (
    <Suspense>
      <ScenariosContent />
    </Suspense>
  );
}
