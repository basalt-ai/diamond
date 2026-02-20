import { z } from "zod";

const ColumnRefSchema = z.object({
  column: z.string().min(1),
});

export const FieldMappingSchema = z
  .object({
    inputs: z.array(ColumnRefSchema).min(1),
    outputs: z.array(ColumnRefSchema).min(1),
    traceId: ColumnRefSchema.optional(),
    trace: z.array(ColumnRefSchema).optional(),
    outcomes: z.array(ColumnRefSchema).optional(),
    occurredAt: ColumnRefSchema.optional(),
    modelVersion: ColumnRefSchema.optional(),
    locale: ColumnRefSchema.optional(),
    planTier: ColumnRefSchema.optional(),
    device: ColumnRefSchema.optional(),
    scenarioTypeId: ColumnRefSchema.optional(),
    hasNegativeFeedback: ColumnRefSchema.optional(),
    metadata: z.array(ColumnRefSchema).optional(),
  })
  .strict();

export type ColumnRef = z.infer<typeof ColumnRefSchema>;
export type FieldMapping = z.infer<typeof FieldMappingSchema>;

export function getAllMappedColumns(mapping: FieldMapping): string[] {
  const columns: string[] = [];

  for (const ref of mapping.inputs) columns.push(ref.column);
  for (const ref of mapping.outputs) columns.push(ref.column);
  if (mapping.traceId) columns.push(mapping.traceId.column);
  if (mapping.trace) for (const ref of mapping.trace) columns.push(ref.column);
  if (mapping.outcomes)
    for (const ref of mapping.outcomes) columns.push(ref.column);
  if (mapping.occurredAt) columns.push(mapping.occurredAt.column);
  if (mapping.modelVersion) columns.push(mapping.modelVersion.column);
  if (mapping.locale) columns.push(mapping.locale.column);
  if (mapping.planTier) columns.push(mapping.planTier.column);
  if (mapping.device) columns.push(mapping.device.column);
  if (mapping.scenarioTypeId) columns.push(mapping.scenarioTypeId.column);
  if (mapping.hasNegativeFeedback)
    columns.push(mapping.hasNegativeFeedback.column);
  if (mapping.metadata)
    for (const ref of mapping.metadata) columns.push(ref.column);

  return columns;
}
