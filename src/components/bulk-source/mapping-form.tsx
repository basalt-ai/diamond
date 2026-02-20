"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { DiscoveredColumn } from "@/components/bulk-source/schema-table";
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
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useMutation } from "@/hooks/use-mutation";

interface MappingFormProps {
  columns: DiscoveredColumn[];
  sourceId: string;
  existingMapping?: Record<string, unknown>;
  onSaved: () => void;
  onCancel?: () => void;
}

interface ColumnRef {
  column: string;
}

interface FieldMappingState {
  inputs: string[];
  outputs: string[];
  traceId: string;
  trace: string[];
  outcomes: string[];
  occurredAt: string;
  modelVersion: string;
  locale: string;
  planTier: string;
  device: string;
  scenarioTypeId: string;
  hasNegativeFeedback: string;
  metadata: string[];
}

function parseExisting(mapping?: Record<string, unknown>): FieldMappingState {
  if (!mapping) return emptyState();

  const toArr = (val: unknown): string[] => {
    if (!Array.isArray(val)) return [];
    return (val as ColumnRef[]).map((r) => r.column);
  };

  const toStr = (val: unknown): string => {
    if (!val || typeof val !== "object") return "";
    return (val as ColumnRef).column ?? "";
  };

  return {
    inputs: toArr(mapping.inputs),
    outputs: toArr(mapping.outputs),
    traceId: toStr(mapping.traceId),
    trace: toArr(mapping.trace),
    outcomes: toArr(mapping.outcomes),
    occurredAt: toStr(mapping.occurredAt),
    modelVersion: toStr(mapping.modelVersion),
    locale: toStr(mapping.locale),
    planTier: toStr(mapping.planTier),
    device: toStr(mapping.device),
    scenarioTypeId: toStr(mapping.scenarioTypeId),
    hasNegativeFeedback: toStr(mapping.hasNegativeFeedback),
    metadata: toArr(mapping.metadata),
  };
}

function emptyState(): FieldMappingState {
  return {
    inputs: [],
    outputs: [],
    traceId: "",
    trace: [],
    outcomes: [],
    occurredAt: "",
    modelVersion: "",
    locale: "",
    planTier: "",
    device: "",
    scenarioTypeId: "",
    hasNegativeFeedback: "",
    metadata: [],
  };
}

function buildPayload(state: FieldMappingState): Record<string, unknown> {
  const toRefs = (arr: string[]) => arr.map((column) => ({ column }));
  const toRef = (val: string) => (val ? { column: val } : undefined);

  return {
    inputs: toRefs(state.inputs),
    outputs: toRefs(state.outputs),
    ...(state.traceId ? { traceId: toRef(state.traceId) } : {}),
    ...(state.trace.length > 0 ? { trace: toRefs(state.trace) } : {}),
    ...(state.outcomes.length > 0 ? { outcomes: toRefs(state.outcomes) } : {}),
    ...(state.occurredAt ? { occurredAt: toRef(state.occurredAt) } : {}),
    ...(state.modelVersion ? { modelVersion: toRef(state.modelVersion) } : {}),
    ...(state.locale ? { locale: toRef(state.locale) } : {}),
    ...(state.planTier ? { planTier: toRef(state.planTier) } : {}),
    ...(state.device ? { device: toRef(state.device) } : {}),
    ...(state.scenarioTypeId
      ? { scenarioTypeId: toRef(state.scenarioTypeId) }
      : {}),
    ...(state.hasNegativeFeedback
      ? { hasNegativeFeedback: toRef(state.hasNegativeFeedback) }
      : {}),
    ...(state.metadata.length > 0 ? { metadata: toRefs(state.metadata) } : {}),
  };
}

function getMappedColumns(state: FieldMappingState): Set<string> {
  const cols = new Set<string>();
  for (const c of state.inputs) cols.add(c);
  for (const c of state.outputs) cols.add(c);
  if (state.traceId) cols.add(state.traceId);
  for (const c of state.trace) cols.add(c);
  for (const c of state.outcomes) cols.add(c);
  if (state.occurredAt) cols.add(state.occurredAt);
  if (state.modelVersion) cols.add(state.modelVersion);
  if (state.locale) cols.add(state.locale);
  if (state.planTier) cols.add(state.planTier);
  if (state.device) cols.add(state.device);
  if (state.scenarioTypeId) cols.add(state.scenarioTypeId);
  if (state.hasNegativeFeedback) cols.add(state.hasNegativeFeedback);
  for (const c of state.metadata) cols.add(c);
  return cols;
}

function truncateSample(value: unknown, max = 20): string {
  const str = value === null ? "null" : String(value);
  return str.length > max ? str.slice(0, max) + "\u2026" : str;
}

function MappingForm({
  columns,
  sourceId,
  existingMapping,
  onSaved,
  onCancel,
}: MappingFormProps) {
  const [state, setState] = useState<FieldMappingState>(() =>
    parseExisting(existingMapping)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutate: saveMapping, isPending } = useMutation(
    "PUT",
    `/bulk-sources/${sourceId}/mapping`,
    {
      onSuccess: () => {
        toast.success("Mapping saved");
        onSaved();
      },
      onError: (err) => toast.error(err.message),
    }
  );

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (state.inputs.length === 0)
      errs.inputs = "At least one input column is required";
    if (state.outputs.length === 0)
      errs.outputs = "At least one output column is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    saveMapping(buildPayload(state));
  }

  const mappedCols = getMappedColumns(state);
  const unmappedCols = columns.filter((c) => !mappedCols.has(c.name));

  const columnNames = columns.map((c) => c.name);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Column Mapping</CardTitle>
        <CardDescription>
          Map discovered columns to Episode fields.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Required Fields */}
        <div className="space-y-4">
          <p className="text-xs font-medium">Required Fields</p>
          <MultiColumnField
            label="Inputs *"
            description="Columns containing user input (prompts, messages)"
            columns={columns}
            selected={state.inputs}
            onChange={(v) => setState((s) => ({ ...s, inputs: v }))}
            error={errors.inputs}
          />
          <MultiColumnField
            label="Outputs *"
            description="Columns containing model output (responses)"
            columns={columns}
            selected={state.outputs}
            onChange={(v) => setState((s) => ({ ...s, outputs: v }))}
            error={errors.outputs}
          />
        </div>

        <Separator />

        {/* Identity */}
        <div className="space-y-4">
          <p className="text-xs font-medium">Identity</p>
          <SingleColumnField
            label="Trace ID"
            description="Dedup key (fallback: row content hash)"
            columns={columns}
            value={state.traceId}
            onChange={(v) => setState((s) => ({ ...s, traceId: v }))}
          />
        </div>

        <Separator />

        {/* Optional Fields */}
        <div className="space-y-4">
          <p className="text-xs font-medium">Optional Fields</p>
          <MultiColumnField
            label="Trace"
            columns={columns}
            selected={state.trace}
            onChange={(v) => setState((s) => ({ ...s, trace: v }))}
          />
          <MultiColumnField
            label="Outcomes"
            columns={columns}
            selected={state.outcomes}
            onChange={(v) => setState((s) => ({ ...s, outcomes: v }))}
          />
          <SingleColumnField
            label="Occurred At"
            hint="TIMESTAMP"
            columns={columns}
            value={state.occurredAt}
            onChange={(v) => setState((s) => ({ ...s, occurredAt: v }))}
          />
          <SingleColumnField
            label="Model Version"
            columns={columns}
            value={state.modelVersion}
            onChange={(v) => setState((s) => ({ ...s, modelVersion: v }))}
          />
          <SingleColumnField
            label="Locale"
            columns={columns}
            value={state.locale}
            onChange={(v) => setState((s) => ({ ...s, locale: v }))}
          />
          <SingleColumnField
            label="Plan Tier"
            columns={columns}
            value={state.planTier}
            onChange={(v) => setState((s) => ({ ...s, planTier: v }))}
          />
          <SingleColumnField
            label="Device"
            columns={columns}
            value={state.device}
            onChange={(v) => setState((s) => ({ ...s, device: v }))}
          />
          <SingleColumnField
            label="Scenario Type ID"
            columns={columns}
            value={state.scenarioTypeId}
            onChange={(v) => setState((s) => ({ ...s, scenarioTypeId: v }))}
          />
          <SingleColumnField
            label="Has Negative Feedback"
            hint="BOOLEAN"
            columns={columns}
            value={state.hasNegativeFeedback}
            onChange={(v) =>
              setState((s) => ({ ...s, hasNegativeFeedback: v }))
            }
          />
          <MultiColumnField
            label="Metadata"
            columns={columns}
            selected={state.metadata}
            onChange={(v) => setState((s) => ({ ...s, metadata: v }))}
          />
        </div>

        {/* Unmapped columns */}
        {unmappedCols.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Unmapped Columns ({unmappedCols.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {unmappedCols.map((col) => (
                  <Badge
                    key={col.name}
                    variant="secondary"
                    className="font-mono text-[10px]"
                  >
                    {col.name}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving\u2026" : "Save Mapping"}
        </Button>
      </CardFooter>
    </Card>
  );
}

// ── Column selector fields ──────────────────────────────────────

function ColumnOption({ col }: { col: DiscoveredColumn }) {
  const sample = col.sampleValues[0];
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono">{col.name}</span>
      <Badge variant="secondary" className="text-[10px]">
        {col.type}
      </Badge>
      {sample !== undefined && (
        <span className="text-muted-foreground">{truncateSample(sample)}</span>
      )}
    </div>
  );
}

function SingleColumnField({
  label,
  description,
  hint,
  columns,
  value,
  onChange,
  error,
}: {
  label: string;
  description?: string;
  hint?: string;
  columns: DiscoveredColumn[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <Field>
      <Label>
        {label}
        {hint && <span className="ml-1 text-muted-foreground">({hint})</span>}
      </Label>
      <Combobox value={value} onValueChange={(val) => onChange(val ?? "")}>
        <ComboboxInput placeholder="Select column..." showClear={!!value} />
        <ComboboxContent>
          <ComboboxList>
            {columns.map((col) => (
              <ComboboxItem key={col.name} value={col.name}>
                <ColumnOption col={col} />
              </ComboboxItem>
            ))}
            <ComboboxEmpty>No columns found</ComboboxEmpty>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}

function MultiColumnField({
  label,
  description,
  columns,
  selected,
  onChange,
  error,
}: {
  label: string;
  description?: string;
  columns: DiscoveredColumn[];
  selected: string[];
  onChange: (values: string[]) => void;
  error?: string;
}) {
  const available = columns.filter((c) => !selected.includes(c.name));

  function addColumn(name: string | null) {
    if (name && !selected.includes(name)) {
      onChange([...selected, name]);
    }
  }

  function removeColumn(name: string) {
    onChange(selected.filter((c) => c !== name));
  }

  return (
    <Field>
      <Label>{label}</Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((col) => (
            <Badge
              key={col}
              variant="secondary"
              className="gap-1 font-mono text-[10px]"
            >
              {col}
              <button
                type="button"
                className="ml-0.5 hover:text-destructive"
                onClick={() => removeColumn(col)}
              >
                \u00d7
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Combobox value="" onValueChange={addColumn}>
        <ComboboxInput placeholder="Add column..." />
        <ComboboxContent>
          <ComboboxList>
            {available.map((col) => (
              <ComboboxItem key={col.name} value={col.name}>
                <ColumnOption col={col} />
              </ComboboxItem>
            ))}
            <ComboboxEmpty>No columns available</ComboboxEmpty>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}

export { MappingForm };
