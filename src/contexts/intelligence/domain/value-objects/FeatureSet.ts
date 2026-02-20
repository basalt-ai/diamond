import { z } from "zod";

export const FeatureSetSchema = z.object({
  turnCount: z.number().int().nonnegative(),
  toolCallCount: z.number().int().nonnegative(),
  hasNegativeFeedback: z.boolean(),
  inputTokenCount: z.number().int().nonnegative(),
  outputTokenCount: z.number().int().nonnegative(),
  modelVersion: z.string().nullable(),
  episodeAgeHours: z.number().nonnegative(),
  toolErrorRate: z.number().min(0).max(1),
});

export type FeatureSet = z.infer<typeof FeatureSetSchema>;
