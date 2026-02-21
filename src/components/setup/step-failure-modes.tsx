"use client";

import { ArrowLeftIcon, ArrowRightIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { useMutation } from "@/hooks/use-mutation";
import type { PaginatedResponse } from "@/lib/api-client";

import type { StepProps } from "./types";

interface FailureMode {
  id: string;
  name: string;
  description: string;
  severity: string;
}

const DEFAULT_FAILURE_MODES = [
  {
    name: "hallucination",
    description: "Model generates factually incorrect information",
    severity: "critical",
  },
  {
    name: "refusal_error",
    description: "Model refuses a valid request inappropriately",
    severity: "high",
  },
  {
    name: "tool_misuse",
    description: "Model calls tools incorrectly or with wrong parameters",
    severity: "high",
  },
  {
    name: "policy_violation",
    description: "Model violates safety or content policies",
    severity: "critical",
  },
  {
    name: "retrieval_miss",
    description: "Model fails to use relevant retrieved context",
    severity: "medium",
  },
  {
    name: "instruction_drift",
    description: "Model ignores or contradicts user instructions",
    severity: "medium",
  },
] as const;

export function StepFailureModes({
  onNext,
  onBack,
  onReadinessChange,
}: StepProps) {
  const { data, isLoading, refetch } =
    useApi<PaginatedResponse<FailureMode>>("/failure-modes");

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");

  const { mutate: createMode, isPending: isCreating } = useMutation(
    "POST",
    "/failure-modes",
    {
      onSuccess: () => {
        toast.success("Failure mode created");
        setName("");
        setDescription("");
        setShowForm(false);
        refetch();
        onReadinessChange();
      },
      onError: (err) => toast.error(err.message),
    }
  );

  const [isSeeding, setIsSeeding] = useState(false);

  async function handleUseDefaults() {
    setIsSeeding(true);
    try {
      for (const fm of DEFAULT_FAILURE_MODES) {
        try {
          await fetch("/api/v1/failure-modes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fm),
          });
        } catch {
          // ignore duplicates
        }
      }
      toast.success("Default failure modes created");
      refetch();
      onReadinessChange();
    } finally {
      setIsSeeding(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMode({ name, description, severity });
  }

  const modes = data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Failure Modes</CardTitle>
        <CardDescription>
          Define common failure modes. This step is recommended but optional —
          you can skip it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : modes.length > 0 ? (
          <div className="space-y-2">
            {modes.map((mode) => (
              <div
                key={mode.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div>
                  <span className="text-sm font-medium">{mode.name}</span>
                  {mode.description && (
                    <p className="text-xs text-muted-foreground">
                      {mode.description}
                    </p>
                  )}
                </div>
                <Badge variant="secondary">{mode.severity}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No failure modes yet. Create some or use the defaults.
          </p>
        )}

        {!showForm && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(true)}
            >
              <PlusIcon className="mr-1 size-3" />
              Add Custom
            </Button>
            {modes.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUseDefaults}
                disabled={isSeeding}
              >
                {isSeeding ? "Creating..." : "Use Defaults (6 modes)"}
              </Button>
            )}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="space-y-3 rounded-md border p-3"
          >
            <Field>
              <Label htmlFor="fm-name">Name</Label>
              <Input
                id="fm-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. hallucination"
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
              />
            </Field>
            <Field>
              <Label htmlFor="fm-sev">Severity</Label>
              <select
                id="fm-sev"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="critical">critical</option>
              </select>
            </Field>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isCreating}>
                {isCreating ? "Creating..." : "Add"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeftIcon className="mr-2 size-4" />
          Back
        </Button>
        <Button onClick={onNext}>
          {modes.length === 0 ? "Skip" : "Next"}
          <ArrowRightIcon className="ml-2 size-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
