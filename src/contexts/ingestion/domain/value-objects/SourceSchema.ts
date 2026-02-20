import { z } from "zod";

export const DiscoveredColumnSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  nullable: z.boolean(),
  sampleValues: z.array(z.unknown()),
});

export const SourceSchemaSchema = z.object({
  format: z.string().min(1),
  rowCount: z.number().int().nonnegative(),
  columns: z.array(DiscoveredColumnSchema).min(1),
  checksum: z.string().min(1),
});

export type DiscoveredColumn = z.infer<typeof DiscoveredColumnSchema>;
export type SourceSchema = z.infer<typeof SourceSchemaSchema>;
