import type { UUID } from "@/shared/types";

import type {
  DimensionScorer,
  ScoringContext,
} from "../../application/ports/ScoringEngine";

export class FailureProbabilityScorer implements DimensionScorer {
  readonly dimension = "failureProbability" as const;

  async score(ctx: ScoringContext): Promise<number> {
    return computeFailureProbability(ctx);
  }

  async scoreBatch(contexts: ScoringContext[]): Promise<Map<UUID, number>> {
    const results = new Map<UUID, number>();
    for (const ctx of contexts) {
      results.set(ctx.candidateId, computeFailureProbability(ctx));
    }
    return results;
  }
}

function computeFailureProbability(ctx: ScoringContext): number {
  let score = 0;

  // Negative feedback is a strong signal
  if (ctx.features.hasNegativeFeedback) {
    score += 0.4;
  }

  // High tool error rate
  score += ctx.features.toolErrorRate * 0.3;

  // Low mapping confidence suggests unusual input
  if (ctx.mappingConfidence < 0.5) {
    score += 0.2;
  }

  // Very long conversations may indicate struggle
  if (ctx.features.turnCount > 20) {
    score += 0.1;
  }

  return Math.min(1, score);
}
