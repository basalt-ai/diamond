"use client";

import { ArrowLeftIcon, SendIcon, TagIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { JsonViewer } from "@/components/json-viewer";
import { StateBadge } from "@/components/state-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { useMutation } from "@/hooks/use-mutation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LabelTaskState =
  | "pending"
  | "in_progress"
  | "review"
  | "adjudication"
  | "finalized"
  | "cancelled";

interface LabelTask {
  id: string;
  candidateId: string;
  rubricId: string;
  rubricVersion: number;
  scenarioTypeId: string;
  assignedTo: string | null;
  state: LabelTaskState;
  preLabel: unknown;
  adjudicationRecord: unknown;
  finalLabelId: string | null;
  labelsRequired: number;
  createdAt: string;
  updatedAt: string;
}

interface LabelRecord {
  id: string;
  labelTaskId: string;
  annotatorId: string;
  labelType: string;
  value: unknown;
  confidence: number;
  rationale: string | null;
  version: number;
  isCurrent: boolean;
  createdAt: string;
}

interface LabelsResponse {
  data: LabelRecord[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HARDCODED_ANNOTATOR_ID = "019515a0-0000-7000-8000-000000000001";

const LABEL_TYPES = [
  "discrete",
  "rubric_scored",
  "extractive",
  "generative",
  "set_valued",
] as const;

interface StateAction {
  action: "assign" | "submit" | "request_review" | "finalize" | "cancel";
  label: string;
  description: string;
  variant: "default" | "destructive";
}

const STATE_TRANSITIONS: Record<LabelTaskState, StateAction[]> = {
  pending: [
    {
      action: "assign",
      label: "Assign",
      description: "Assign this task to begin annotation.",
      variant: "default",
    },
    {
      action: "cancel",
      label: "Cancel",
      description: "Cancel this label task permanently.",
      variant: "destructive",
    },
  ],
  in_progress: [
    {
      action: "submit",
      label: "Submit for Review",
      description: "Submit this task for review.",
      variant: "default",
    },
    {
      action: "cancel",
      label: "Cancel",
      description: "Cancel this label task permanently.",
      variant: "destructive",
    },
  ],
  review: [
    {
      action: "finalize",
      label: "Finalize",
      description: "Finalize this label task. This action cannot be undone.",
      variant: "default",
    },
    {
      action: "request_review",
      label: "Request Adjudication",
      description: "Send this task to adjudication for further review.",
      variant: "default",
    },
    {
      action: "cancel",
      label: "Cancel",
      description: "Cancel this label task permanently.",
      variant: "destructive",
    },
  ],
  adjudication: [
    {
      action: "finalize",
      label: "Finalize",
      description: "Finalize this label task. This action cannot be undone.",
      variant: "default",
    },
    {
      action: "cancel",
      label: "Cancel",
      description: "Cancel this label task permanently.",
      variant: "destructive",
    },
  ],
  finalized: [],
  cancelled: [],
};

function truncateId(id: string): string {
  return id.slice(0, 8) + "\u2026";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TaskHeaderSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="flex gap-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}

function AnnotateForm({
  taskId,
  onSuccess,
}: {
  taskId: string;
  onSuccess: () => void;
}) {
  const [labelType, setLabelType] = useState<string>("discrete");
  const [value, setValue] = useState("");
  const [confidence, setConfidence] = useState("0.5");
  const [rationale, setRationale] = useState("");

  const { mutate, isPending } = useMutation("POST", "/labels", {
    onSuccess: () => {
      toast.success("Label submitted successfully");
      setValue("");
      setConfidence("0.5");
      setRationale("");
      onSuccess();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(value);
    } catch {
      toast.error("Value must be valid JSON");
      return;
    }

    const conf = Number(confidence);
    if (Number.isNaN(conf) || conf < 0 || conf > 1) {
      toast.error("Confidence must be a number between 0 and 1");
      return;
    }

    mutate({
      label_task_id: taskId,
      annotator_id: HARDCODED_ANNOTATOR_ID,
      label_type: labelType,
      value: parsedValue,
      confidence: conf,
      rationale: rationale || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Label Type</Label>
        <Select value={labelType} onValueChange={setLabelType}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LABEL_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Value (JSON)</Label>
        <Textarea
          placeholder='{"score": 4, "category": "helpful"}'
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={4}
          className="font-mono text-xs"
        />
      </div>

      <div className="space-y-2">
        <Label>Confidence (0-1)</Label>
        <Input
          type="number"
          min={0}
          max={1}
          step={0.01}
          value={confidence}
          onChange={(e) => setConfidence(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Rationale (optional)</Label>
        <Textarea
          placeholder="Explain your labeling rationale..."
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          rows={3}
        />
      </div>

      <Button type="submit" disabled={isPending || !value}>
        <SendIcon className="mr-2 size-4" />
        {isPending ? "Submitting..." : "Submit Label"}
      </Button>
    </form>
  );
}

function LabelsList({ taskId }: { taskId: string }) {
  const { data, isLoading } = useApi<LabelsResponse>(
    `/labels?label_task_id=${taskId}`
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const labels = data?.data ?? [];

  if (labels.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No labels have been submitted for this task yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {labels.map((label) => (
        <Card key={label.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                {label.labelType.replace(/_/g, " ")}
              </CardTitle>
              <span className="text-muted-foreground text-xs">
                {new Date(label.createdAt).toLocaleString()}
              </span>
            </div>
            <CardDescription>
              Annotator: {truncateId(label.annotatorId)} | Confidence:{" "}
              {label.confidence.toFixed(2)} | Version: {label.version}
              {label.isCurrent ? " (current)" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-medium">
                Value
              </p>
              <JsonViewer data={label.value} defaultExpanded />
            </div>
            {label.rationale ? (
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium">
                  Rationale
                </p>
                <p className="text-sm">{label.rationale}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LabelTaskDetailPage() {
  const params = useParams<{ id: string }>();
  const taskId = params.id;

  const {
    data: task,
    isLoading,
    refetch,
  } = useApi<LabelTask>(`/label-tasks/${taskId}`);

  const [confirmAction, setConfirmAction] = useState<StateAction | null>(null);

  const { mutate: transitionState, isPending: isTransitioning } = useMutation(
    "PATCH",
    `/label-tasks/${taskId}/state`,
    {
      onSuccess: () => {
        toast.success("Task state updated");
        refetch();
        setConfirmAction(null);
      },
      onError: (err) => {
        toast.error(err.message);
        setConfirmAction(null);
      },
    }
  );

  const handleTransition = useCallback(
    (action: StateAction) => {
      const body: Record<string, string> = { action: action.action };
      if (action.action === "assign") {
        body["assigned_to"] = HARDCODED_ANNOTATOR_ID;
      }
      transitionState(body);
    },
    [transitionState]
  );

  const availableActions = task ? STATE_TRANSITIONS[task.state] : [];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/labeling">
          <ArrowLeftIcon className="mr-2 size-4" />
          Back to Queue
        </Link>
      </Button>

      {/* Task header */}
      {isLoading || !task ? (
        <TaskHeaderSkeleton />
      ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold">
                  Task {truncateId(task.id)}
                </h1>
                <StateBadge state={task.state} />
              </div>
              <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span>Candidate: {truncateId(task.candidateId)}</span>
                <span>
                  Rubric: {truncateId(task.rubricId)} v{task.rubricVersion}
                </span>
                <span>
                  Assigned:{" "}
                  {task.assignedTo ? truncateId(task.assignedTo) : "\u2014"}
                </span>
                <span>Labels required: {task.labelsRequired}</span>
              </div>
            </div>
          </div>

          {/* State transition buttons */}
          {availableActions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {availableActions.map((action) => (
                <Button
                  key={action.action}
                  variant={
                    action.variant === "destructive" ? "destructive" : "outline"
                  }
                  size="sm"
                  disabled={isTransitioning}
                  onClick={() => setConfirmAction(action)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          ) : null}

          <Separator />
        </div>
      )}

      {/* Confirm dialog for state transitions */}
      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        title={confirmAction?.label ?? ""}
        description={confirmAction?.description ?? ""}
        confirmLabel={confirmAction?.label ?? "Confirm"}
        variant={confirmAction?.variant ?? "default"}
        onConfirm={() => {
          if (confirmAction) handleTransition(confirmAction);
        }}
      />

      {/* Tabs */}
      {task ? (
        <Tabs defaultValue="annotate">
          <TabsList>
            <TabsTrigger value="annotate">Annotate</TabsTrigger>
            <TabsTrigger value="labels">Labels</TabsTrigger>
          </TabsList>

          <TabsContent value="annotate">
            <Card>
              <CardHeader>
                <CardTitle>Submit Annotation</CardTitle>
                <CardDescription>
                  {task.state === "finalized"
                    ? "This task has been finalized."
                    : task.state === "cancelled"
                      ? "This task has been cancelled."
                      : "Provide a label for this candidate."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {task.state === "finalized" ? (
                  <div className="space-y-3">
                    <p className="text-sm">
                      Final Label ID:{" "}
                      {task.finalLabelId
                        ? truncateId(task.finalLabelId)
                        : "\u2014"}
                    </p>
                    {task.adjudicationRecord ? (
                      <div>
                        <p className="text-muted-foreground mb-1 text-xs font-medium">
                          Adjudication Record
                        </p>
                        <JsonViewer
                          data={task.adjudicationRecord}
                          defaultExpanded
                        />
                      </div>
                    ) : null}
                  </div>
                ) : task.state === "cancelled" ? (
                  <p className="text-muted-foreground text-sm">
                    No further annotations can be submitted.
                  </p>
                ) : (
                  <AnnotateForm taskId={task.id} onSuccess={refetch} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="labels">
            <Card>
              <CardHeader>
                <CardTitle>Submitted Labels</CardTitle>
                <CardDescription>
                  All labels submitted for this task
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LabelsList taskId={task.id} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
