"use client";

import { AlertTriangleIcon, PlusIcon } from "lucide-react";
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

interface FailureMode {
  id: string;
  name: string;
  description: string;
  severity: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

const SEVERITIES = ["low", "medium", "high", "critical"] as const;

const PAGE_SIZE = 20;

function severityVariant(
  severity: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (severity) {
    case "critical":
      return "destructive";
    case "high":
      return "default";
    case "medium":
      return "secondary";
    default:
      return "outline";
  }
}

const columns: ColumnDef<FailureMode>[] = [
  {
    id: "name",
    header: "Name",
    accessorFn: (row) => row.name,
    sortable: true,
  },
  {
    id: "category",
    header: "Category",
    accessorFn: (row) => row.category,
    sortable: true,
  },
  {
    id: "severity",
    header: "Severity",
    accessorFn: (row) => (
      <Badge variant={severityVariant(row.severity)}>{row.severity}</Badge>
    ),
    sortable: true,
  },
  {
    id: "description",
    header: "Description",
    accessorFn: (row) => row.description,
    className: "max-w-xs truncate",
  },
];

function FailureModesContent() {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") ?? "1");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("");
  const [category, setCategory] = useState("");

  const { data, isLoading, refetch } = useApi<PaginatedResponse<FailureMode>>(
    `/failure-modes?page=${page}&page_size=${PAGE_SIZE}`
  );

  const { mutate, isPending } = useMutation("POST", "/failure-modes", {
    onSuccess: () => {
      toast.success("Failure mode created");
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
    setSeverity("");
    setCategory("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate({
      name,
      description,
      severity,
      category,
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Failure Modes</h1>
          <p className="text-xs text-muted-foreground">
            Define failure modes and their severities
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon className="size-4" />
          Create Failure Mode
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon={AlertTriangleIcon}
            title="No failure modes"
            description="Create your first failure mode to categorize potential issues."
            action={{
              label: "Create Failure Mode",
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
            <DialogTitle>Create Failure Mode</DialogTitle>
            <DialogDescription>
              Add a new failure mode to the catalog.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field>
              <Label htmlFor="fm-name">Name</Label>
              <Input
                id="fm-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hallucination"
                required
              />
            </Field>
            <Field>
              <Label htmlFor="fm-desc">Description</Label>
              <Textarea
                id="fm-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this failure mode..."
                required
              />
            </Field>
            <Field>
              <Label>Severity</Label>
              <Select value={severity} onValueChange={setSeverity} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <Label htmlFor="fm-cat">Category</Label>
              <Input
                id="fm-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Safety, Accuracy"
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

export default function FailureModesPage() {
  return (
    <Suspense>
      <FailureModesContent />
    </Suspense>
  );
}
