"use client";

import { ArrowLeftIcon, SendIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@/hooks/use-mutation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IngestEpisodePayload {
  source: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  trace?: Record<string, unknown>;
  outcomes?: Record<string, unknown>;
  modelVersion?: string;
  scenarioTypeId?: string;
  metadata?: Record<string, unknown>;
}

interface FormErrors {
  source?: string;
  inputs?: string;
  outputs?: string;
  trace?: string;
  outcomes?: string;
  metadata?: string;
}

// ---------------------------------------------------------------------------
// JSON parse helper
// ---------------------------------------------------------------------------

function tryParseJson(
  value: string,
  fieldName: string
): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  if (!value.trim()) {
    return { ok: true, data: {} };
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return { ok: false, error: `${fieldName} must be a JSON object` };
    }
    return { ok: true, data: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, error: `${fieldName} contains invalid JSON` };
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function IngestEpisodePage() {
  const router = useRouter();

  const [source, setSource] = useState("");
  const [inputsJson, setInputsJson] = useState("");
  const [outputsJson, setOutputsJson] = useState("");
  const [traceJson, setTraceJson] = useState("");
  const [outcomesJson, setOutcomesJson] = useState("");
  const [modelVersion, setModelVersion] = useState("");
  const [scenarioTypeId, setScenarioTypeId] = useState("");
  const [metadataJson, setMetadataJson] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const { mutate, isPending } = useMutation("POST", "/episodes", {
    onSuccess: () => {
      toast.success("Episode ingested successfully");
      router.push("/episodes");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to ingest episode");
    },
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const newErrors: FormErrors = {};

      // Validate required fields
      if (!source.trim()) {
        newErrors.source = "Source is required";
      }

      // Parse JSON fields
      const inputsResult = tryParseJson(inputsJson, "Inputs");
      if (!inputsJson.trim()) {
        newErrors.inputs = "Inputs is required";
      } else if (!inputsResult.ok) {
        newErrors.inputs = inputsResult.error;
      }

      const outputsResult = tryParseJson(outputsJson, "Outputs");
      if (!outputsJson.trim()) {
        newErrors.outputs = "Outputs is required";
      } else if (!outputsResult.ok) {
        newErrors.outputs = outputsResult.error;
      }

      const traceResult = tryParseJson(traceJson, "Trace");
      if (traceJson.trim() && !traceResult.ok) {
        newErrors.trace = traceResult.error;
      }

      const outcomesResult = tryParseJson(outcomesJson, "Outcomes");
      if (outcomesJson.trim() && !outcomesResult.ok) {
        newErrors.outcomes = outcomesResult.error;
      }

      const metadataResult = tryParseJson(metadataJson, "Metadata");
      if (metadataJson.trim() && !metadataResult.ok) {
        newErrors.metadata = metadataResult.error;
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      setErrors({});

      const payload: IngestEpisodePayload = {
        source: source.trim(),
        inputs: inputsResult.ok ? inputsResult.data : {},
        outputs: outputsResult.ok ? outputsResult.data : {},
      };

      if (traceResult.ok && traceJson.trim()) {
        payload.trace = traceResult.data;
      }
      if (outcomesResult.ok && outcomesJson.trim()) {
        payload.outcomes = outcomesResult.data;
      }
      if (modelVersion.trim()) {
        payload.modelVersion = modelVersion.trim();
      }
      if (scenarioTypeId.trim()) {
        payload.scenarioTypeId = scenarioTypeId.trim();
      }
      if (metadataResult.ok && metadataJson.trim()) {
        payload.metadata = metadataResult.data;
      }

      mutate(payload);
    },
    [
      source,
      inputsJson,
      outputsJson,
      traceJson,
      outcomesJson,
      modelVersion,
      scenarioTypeId,
      metadataJson,
      mutate,
    ]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/episodes">
            <ArrowLeftIcon className="size-4" />
            <span className="sr-only">Back to Episodes</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Ingest Episode</h1>
          <p className="text-muted-foreground mt-1">
            Manually ingest a new episode into the system
          </p>
        </div>
      </div>

      <Separator />

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Episode Data</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {/* Source */}
              <Field data-invalid={!!errors.source}>
                <FieldLabel htmlFor="source">Source *</FieldLabel>
                <Input
                  id="source"
                  placeholder="e.g. production-api, staging-webhook"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />
                <FieldDescription>
                  Identifier for the source system that produced this episode
                </FieldDescription>
                {errors.source ? (
                  <FieldError>{errors.source}</FieldError>
                ) : null}
              </Field>

              {/* Model Version */}
              <Field>
                <FieldLabel htmlFor="model-version">Model Version</FieldLabel>
                <Input
                  id="model-version"
                  placeholder="e.g. gpt-4-0125-preview"
                  value={modelVersion}
                  onChange={(e) => setModelVersion(e.target.value)}
                />
                <FieldDescription>
                  Version of the model that generated this episode
                </FieldDescription>
              </Field>

              {/* Scenario Type ID */}
              <Field>
                <FieldLabel htmlFor="scenario-type-id">
                  Scenario Type ID
                </FieldLabel>
                <Input
                  id="scenario-type-id"
                  placeholder="UUID of scenario type"
                  value={scenarioTypeId}
                  onChange={(e) => setScenarioTypeId(e.target.value)}
                />
                <FieldDescription>
                  Link this episode to a specific scenario type
                </FieldDescription>
              </Field>

              {/* Inputs */}
              <Field data-invalid={!!errors.inputs}>
                <FieldLabel htmlFor="inputs">Inputs (JSON) *</FieldLabel>
                <Textarea
                  id="inputs"
                  placeholder='{"prompt": "...", "context": "..."}'
                  rows={6}
                  className="font-mono text-xs"
                  value={inputsJson}
                  onChange={(e) => setInputsJson(e.target.value)}
                />
                <FieldDescription>
                  JSON object representing the episode inputs
                </FieldDescription>
                {errors.inputs ? (
                  <FieldError>{errors.inputs}</FieldError>
                ) : null}
              </Field>

              {/* Outputs */}
              <Field data-invalid={!!errors.outputs}>
                <FieldLabel htmlFor="outputs">Outputs (JSON) *</FieldLabel>
                <Textarea
                  id="outputs"
                  placeholder='{"response": "...", "tokens": 123}'
                  rows={6}
                  className="font-mono text-xs"
                  value={outputsJson}
                  onChange={(e) => setOutputsJson(e.target.value)}
                />
                <FieldDescription>
                  JSON object representing the episode outputs
                </FieldDescription>
                {errors.outputs ? (
                  <FieldError>{errors.outputs}</FieldError>
                ) : null}
              </Field>

              {/* Trace */}
              <Field data-invalid={!!errors.trace}>
                <FieldLabel htmlFor="trace">Trace (JSON)</FieldLabel>
                <Textarea
                  id="trace"
                  placeholder='{"latency_ms": 420, "steps": [...]}'
                  rows={4}
                  className="font-mono text-xs"
                  value={traceJson}
                  onChange={(e) => setTraceJson(e.target.value)}
                />
                <FieldDescription>
                  Optional trace data for debugging and analysis
                </FieldDescription>
                {errors.trace ? <FieldError>{errors.trace}</FieldError> : null}
              </Field>

              {/* Outcomes */}
              <Field data-invalid={!!errors.outcomes}>
                <FieldLabel htmlFor="outcomes">Outcomes (JSON)</FieldLabel>
                <Textarea
                  id="outcomes"
                  placeholder='{"user_rating": 4, "resolved": true}'
                  rows={4}
                  className="font-mono text-xs"
                  value={outcomesJson}
                  onChange={(e) => setOutcomesJson(e.target.value)}
                />
                <FieldDescription>
                  Optional outcome data from user feedback or automated
                  evaluation
                </FieldDescription>
                {errors.outcomes ? (
                  <FieldError>{errors.outcomes}</FieldError>
                ) : null}
              </Field>

              {/* Metadata */}
              <Field data-invalid={!!errors.metadata}>
                <FieldLabel htmlFor="metadata">Metadata (JSON)</FieldLabel>
                <Textarea
                  id="metadata"
                  placeholder='{"team": "search", "experiment": "v2"}'
                  rows={4}
                  className="font-mono text-xs"
                  value={metadataJson}
                  onChange={(e) => setMetadataJson(e.target.value)}
                />
                <FieldDescription>
                  Optional metadata tags for filtering and grouping
                </FieldDescription>
                {errors.metadata ? (
                  <FieldError>{errors.metadata}</FieldError>
                ) : null}
              </Field>

              {/* Submit */}
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isPending}>
                  <SendIcon className="mr-2 size-4" />
                  {isPending ? "Ingesting..." : "Ingest Episode"}
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
