"use client";

import { ArrowLeftIcon, BookOpenIcon, PlusIcon, TrashIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { DataTable, type ColumnDef } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/empty-state";
import { JsonViewer } from "@/components/json-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { useMutation } from "@/hooks/use-mutation";

interface ScenarioType {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

interface Rubric {
  id: string;
  scenarioTypeId: string;
  version: number;
  criteria: Array<{ name: string; description: string; weight: number }>;
  examples: Array<{
    input: string;
    expectedOutput: string;
    explanation: string;
  }>;
  createdAt: string;
}

interface CriterionForm {
  name: string;
  description: string;
  weight: string;
}

interface ExampleForm {
  input: string;
  expectedOutput: string;
  explanation: string;
}

const EMPTY_CRITERION: CriterionForm = {
  name: "",
  description: "",
  weight: "1",
};
const EMPTY_EXAMPLE: ExampleForm = {
  input: "",
  expectedOutput: "",
  explanation: "",
};

const rubricColumns: ColumnDef<Rubric>[] = [
  {
    id: "version",
    header: "Version",
    accessorFn: (row) => <Badge variant="secondary">v{row.version}</Badge>,
    sortable: true,
  },
  {
    id: "criteria",
    header: "Criteria",
    accessorFn: (row) =>
      `${row.criteria.length} criterion${row.criteria.length === 1 ? "" : "a"}`,
  },
  {
    id: "created",
    header: "Created",
    accessorFn: (row) => new Date(row.createdAt).toLocaleDateString(),
    sortable: true,
  },
];

export default function ScenarioTypeDetailPage() {
  const params = useParams<{ id: string }>();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [criteria, setCriteria] = useState<CriterionForm[]>([
    { ...EMPTY_CRITERION },
  ]);
  const [examples, setExamples] = useState<ExampleForm[]>([]);

  const { data: scenarioType, isLoading } = useApi<ScenarioType>(
    `/scenario-types/${params.id}`
  );

  const {
    data: rubrics,
    isLoading: rubricsLoading,
    refetch,
  } = useApi<Rubric[]>(`/scenario-types/${params.id}/effective-rubrics`);

  const { mutate, isPending } = useMutation("POST", "/rubrics", {
    onSuccess: () => {
      toast.success("Rubric created");
      setDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  function resetForm() {
    setCriteria([{ ...EMPTY_CRITERION }]);
    setExamples([]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate({
      scenarioTypeId: params.id,
      criteria: criteria.map((c) => ({
        name: c.name,
        description: c.description,
        weight: parseFloat(c.weight),
      })),
      examples: examples.length > 0 ? examples : undefined,
    });
  }

  function updateCriterion(
    index: number,
    field: keyof CriterionForm,
    value: string
  ) {
    setCriteria((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  }

  function updateExample(
    index: number,
    field: keyof ExampleForm,
    value: string
  ) {
    setExamples((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex))
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!scenarioType) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          Scenario type not found.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon-sm" asChild>
          <Link href="/scenarios">
            <ArrowLeftIcon className="size-4" />
            <span className="sr-only">Back to scenarios</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-semibold">{scenarioType.name}</h1>
          <p className="text-xs text-muted-foreground">
            {scenarioType.description}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID</span>
              <span className="font-mono">{scenarioType.id}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Parent</span>
              <span>{scenarioType.parentId ?? "None (root)"}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>
                {new Date(scenarioType.createdAt).toLocaleDateString()}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Updated</span>
              <span>
                {new Date(scenarioType.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Metadata</CardTitle>
            <CardDescription>
              Custom metadata associated with this type
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scenarioType.metadata &&
            Object.keys(scenarioType.metadata).length > 0 ? (
              <JsonViewer data={scenarioType.metadata} defaultExpanded />
            ) : (
              <p className="text-xs text-muted-foreground">No metadata</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Effective Rubrics</h2>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <PlusIcon className="size-4" />
            Create Rubric
          </Button>
        </div>
        <DataTable
          columns={rubricColumns}
          data={rubrics ?? []}
          isLoading={rubricsLoading}
          emptyState={
            <EmptyState
              icon={BookOpenIcon}
              title="No rubrics"
              description="No rubrics are linked to this scenario type yet."
            />
          }
        />
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Rubric</DialogTitle>
            <DialogDescription>
              Define criteria and optional examples for this rubric version.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Criteria</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCriteria((prev) => [...prev, { ...EMPTY_CRITERION }])
                  }
                >
                  <PlusIcon className="size-3" />
                  Add Criterion
                </Button>
              </div>
              {criteria.map((c, i) => (
                <div key={i} className="space-y-3 rounded-md border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_auto]">
                      <Field>
                        <Label htmlFor={`cr-name-${i}`}>Name</Label>
                        <Input
                          id={`cr-name-${i}`}
                          value={c.name}
                          onChange={(e) =>
                            updateCriterion(i, "name", e.target.value)
                          }
                          placeholder="e.g. Accuracy"
                          required
                        />
                      </Field>
                      <Field>
                        <Label htmlFor={`cr-weight-${i}`}>Weight</Label>
                        <Input
                          id={`cr-weight-${i}`}
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={c.weight}
                          onChange={(e) =>
                            updateCriterion(i, "weight", e.target.value)
                          }
                          className="w-24"
                          required
                        />
                      </Field>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        setCriteria((prev) => prev.filter((_, j) => j !== i))
                      }
                      disabled={criteria.length <= 1}
                    >
                      <TrashIcon className="size-3" />
                    </Button>
                  </div>
                  <Field>
                    <Label htmlFor={`cr-desc-${i}`}>Description</Label>
                    <Textarea
                      id={`cr-desc-${i}`}
                      value={c.description}
                      onChange={(e) =>
                        updateCriterion(i, "description", e.target.value)
                      }
                      placeholder="Describe this criterion..."
                      required
                    />
                  </Field>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Examples (optional)
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setExamples((prev) => [...prev, { ...EMPTY_EXAMPLE }])
                  }
                >
                  <PlusIcon className="size-3" />
                  Add Example
                </Button>
              </div>
              {examples.map((ex, i) => (
                <div key={i} className="space-y-3 rounded-md border p-3">
                  <div className="flex items-start justify-between">
                    <Label className="text-xs text-muted-foreground">
                      Example {i + 1}
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        setExamples((prev) => prev.filter((_, j) => j !== i))
                      }
                    >
                      <TrashIcon className="size-3" />
                    </Button>
                  </div>
                  <Field>
                    <Label htmlFor={`ex-input-${i}`}>Input</Label>
                    <Textarea
                      id={`ex-input-${i}`}
                      value={ex.input}
                      onChange={(e) =>
                        updateExample(i, "input", e.target.value)
                      }
                      placeholder="Example input..."
                      required
                    />
                  </Field>
                  <Field>
                    <Label htmlFor={`ex-output-${i}`}>Expected Output</Label>
                    <Textarea
                      id={`ex-output-${i}`}
                      value={ex.expectedOutput}
                      onChange={(e) =>
                        updateExample(i, "expectedOutput", e.target.value)
                      }
                      placeholder="Expected output..."
                      required
                    />
                  </Field>
                  <Field>
                    <Label htmlFor={`ex-expl-${i}`}>Explanation</Label>
                    <Textarea
                      id={`ex-expl-${i}`}
                      value={ex.explanation}
                      onChange={(e) =>
                        updateExample(i, "explanation", e.target.value)
                      }
                      placeholder="Why this is the expected output..."
                      required
                    />
                  </Field>
                </div>
              ))}
              {examples.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No examples added. Click "Add Example" to include sample
                  input/output pairs.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create Rubric"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
