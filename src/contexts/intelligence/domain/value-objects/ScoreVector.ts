import { z } from "zod";

export const ScoreVectorSchema = z
  .object({
    coverageGain: z.number().nonnegative(),
    riskWeight: z.number().nonnegative(),
    novelty: z.number().min(0).max(1),
    failureProbability: z.number().min(0).max(1),
    redundancyPenalty: z.number().min(0).max(1),
  })
  .readonly();

export type ScoreVector = z.infer<typeof ScoreVectorSchema>;

export const SCORE_DIMENSIONS = [
  "coverageGain",
  "riskWeight",
  "novelty",
  "failureProbability",
  "redundancyPenalty",
] as const satisfies ReadonlyArray<keyof ScoreVector>;

export type ScoreDimension = (typeof SCORE_DIMENSIONS)[number];
