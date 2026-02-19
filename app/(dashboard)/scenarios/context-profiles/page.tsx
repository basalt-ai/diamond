"use client";

import { LayersIcon, PlusIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { DataTable, type ColumnDef } from "@/components/data-table/data-table";
import { Pagination } from "@/components/data-table/pagination";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { type PaginatedResponse } from "@/lib/api-client";

interface ContextProfile {
  id: string;
  name: string;
  description: string;
  dimensions: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const PAGE_SIZE = 20;

const columns: ColumnDef<ContextProfile>[] = [
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
    id: "dimensions",
    header: "Dimensions",
    accessorFn: (row) => {
      const count = row.dimensions ? Object.keys(row.dimensions).length : 0;
      return <Badge variant="secondary">{count}</Badge>;
    },
    sortable: true,
  },
];

function ContextProfilesContent() {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") ?? "1");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dimensions, setDimensions] = useState("");

  const { data, isLoading, refetch } = useApi<
    PaginatedResponse<ContextProfile>
  >(`/context-profiles?page=${page}&page_size=${PAGE_SIZE}`);

  const { mutate, isPending } = useMutation("POST", "/context-profiles", {
    onSuccess: () => {
      toast.success("Context profile created");
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
    setDimensions("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let parsedDimensions: Record<string, unknown>;
    try {
      parsedDimensions = JSON.parse(dimensions) as Record<string, unknown>;
    } catch {
      toast.error("Dimensions must be valid JSON");
      return;
    }

    if (
      typeof parsedDimensions !== "object" ||
      parsedDimensions === null ||
      Array.isArray(parsedDimensions)
    ) {
      toast.error("Dimensions must be a JSON object");
      return;
    }

    mutate({
      name,
      description,
      dimensions: parsedDimensions,
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Context Profiles</h1>
          <p className="text-xs text-muted-foreground">
            Manage context profiles and their dimensions
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon className="size-4" />
          Create Profile
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon={LayersIcon}
            title="No context profiles"
            description="Create your first context profile to define evaluation dimensions."
            action={{
              label: "Create Context Profile",
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
            <DialogTitle>Create Context Profile</DialogTitle>
            <DialogDescription>
              Add a new context profile with evaluation dimensions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field>
              <Label htmlFor="cp-name">Name</Label>
              <Input
                id="cp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Medical Consultation"
                required
              />
            </Field>
            <Field>
              <Label htmlFor="cp-desc">Description</Label>
              <Textarea
                id="cp-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this context profile..."
                required
              />
            </Field>
            <Field>
              <Label htmlFor="cp-dims">Dimensions (JSON)</Label>
              <Textarea
                id="cp-dims"
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
                placeholder='{"accuracy": {"weight": 0.5}, "safety": {"weight": 0.5}}'
                className="font-mono"
                rows={5}
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

export default function ContextProfilesPage() {
  return (
    <Suspense>
      <ContextProfilesContent />
    </Suspense>
  );
}
