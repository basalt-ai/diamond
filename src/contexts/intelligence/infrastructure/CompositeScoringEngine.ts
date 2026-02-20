import type { UUID } from "@/shared/types";

import type {
  DimensionScorer,
  ScoringContext,
  ScoringEngine,
} from "../application/ports/ScoringEngine";
import type { ScoreVector } from "../domain/value-objects/ScoreVector";
import { SCORE_DIMENSIONS } from "../domain/value-objects/ScoreVector";

export class CompositeScoringEngine implements ScoringEngine {
  constructor(private readonly scorers: DimensionScorer[]) {
    // Validate all dimensions are covered
    const provided = new Set(scorers.map((s) => s.dimension));
    for (const dim of SCORE_DIMENSIONS) {
      if (!provided.has(dim)) {
        throw new Error(`Missing scorer for dimension: ${dim}`);
      }
    }
  }

  async score(ctx: ScoringContext): Promise<ScoreVector> {
    const scores: Record<string, number> = {};

    for (const scorer of this.scorers) {
      scores[scorer.dimension] = await scorer.score(ctx);
    }

    return scores as unknown as ScoreVector;
  }

  async scoreBatch(
    contexts: ScoringContext[]
  ): Promise<Map<UUID, ScoreVector>> {
    if (contexts.length === 0) return new Map();

    // Run each dimension scorer in batch mode
    const dimensionResults = new Map<string, Map<UUID, number>>();

    for (const scorer of this.scorers) {
      if (scorer.scoreBatch) {
        dimensionResults.set(
          scorer.dimension,
          await scorer.scoreBatch(contexts)
        );
      } else {
        // Fallback: individual scoring
        const map = new Map<UUID, number>();
        for (const ctx of contexts) {
          map.set(ctx.candidateId, await scorer.score(ctx));
        }
        dimensionResults.set(scorer.dimension, map);
      }
    }

    // Assemble ScoreVectors per candidate
    const result = new Map<UUID, ScoreVector>();
    for (const ctx of contexts) {
      const scores: Record<string, number> = {};
      for (const scorer of this.scorers) {
        const dimMap = dimensionResults.get(scorer.dimension);
        scores[scorer.dimension] = dimMap?.get(ctx.candidateId) ?? 0;
      }
      result.set(ctx.candidateId, scores as unknown as ScoreVector);
    }

    return result;
  }
}
