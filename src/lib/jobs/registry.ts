import { z } from "zod";

export const JobPayloads = {
  "embedding.compute": z.object({
    candidateId: z.string().uuid(),
  }),
  "scoring.compute": z.object({
    candidateId: z.string().uuid(),
    runId: z.string().uuid(),
  }),
  "scoring_run.execute": z.object({
    runId: z.string().uuid(),
  }),
  "selection_run.execute": z.object({
    runId: z.string().uuid(),
    budget: z.number().int().positive(),
  }),
  "cluster.detect": z.object({
    minClusterSize: z.number().int().positive().optional(),
  }),
  "labeling.create_tasks": z.object({
    selectionRunId: z.string().uuid(),
  }),
} as const;

export type JobName = keyof typeof JobPayloads;

export type JobPayload<K extends JobName> = z.infer<(typeof JobPayloads)[K]>;
