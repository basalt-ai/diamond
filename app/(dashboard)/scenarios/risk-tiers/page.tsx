"use client";

import { PlusIcon, ShieldIcon } from "lucide-react";
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

interface RiskTier {
  id: string;
  name: string;
  level: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

const PAGE_SIZE = 20;

const columns: ColumnDef<RiskTier>[] = [
  {
    id: "name",
    header: "Name",
    accessorFn: (row) => row.name,
    sortable: true,
  },
  {
    id: "level",
    header: "Level",
    accessorFn: (row) => <Badge variant="secondary">{row.level}</Badge>,
    sortable: true,
  },
  {
    id: "description",
    header: "Description",
    accessorFn: (row) => row.description,
    className: "max-w-md truncate",
  },
];

function RiskTiersContent() {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") ?? "1");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [description, setDescription] = useState("");

  const { data, isLoading, refetch } = useApi<PaginatedResponse<RiskTier>>(
    `/risk-tiers?page=${page}&page_size=${PAGE_SIZE}`
  );

  const { mutate, isPending } = useMutation("POST", "/risk-tiers", {
    onSuccess: () => {
      toast.success("Risk tier created");
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
    setLevel("");
    setDescription("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedLevel = Number(level);
    if (!Number.isFinite(parsedLevel) || parsedLevel < 0) {
      toast.error("Level must be a non-negative number");
      return;
    }
    mutate({
      name,
      level: parsedLevel,
      description,
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Risk Tiers</h1>
          <p className="text-xs text-muted-foreground">
            Define risk tiers and their levels
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon className="size-4" />
          Create Risk Tier
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon={ShieldIcon}
            title="No risk tiers"
            description="Create your first risk tier to define risk levels."
            action={{
              label: "Create Risk Tier",
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
            <DialogTitle>Create Risk Tier</DialogTitle>
            <DialogDescription>
              Add a new risk tier to the system.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field>
              <Label htmlFor="rt-name">Name</Label>
              <Input
                id="rt-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. High Risk"
                required
              />
            </Field>
            <Field>
              <Label htmlFor="rt-level">Level</Label>
              <Input
                id="rt-level"
                type="number"
                min={0}
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder="e.g. 3"
                required
              />
            </Field>
            <Field>
              <Label htmlFor="rt-desc">Description</Label>
              <Textarea
                id="rt-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this risk tier..."
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

export default function RiskTiersPage() {
  return (
    <Suspense>
      <RiskTiersContent />
    </Suspense>
  );
}
