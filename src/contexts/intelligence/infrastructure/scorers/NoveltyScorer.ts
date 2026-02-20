import type { UUID } from "@/shared/types";

import type { RedundancyOracle } from "../../application/ports/RedundancyOracle";
import type {
  DimensionScorer,
  ScoringContext,
} from "../../application/ports/ScoringEngine";

export class NoveltyScorer implements DimensionScorer {
  readonly dimension = "novelty" as const;

  constructor(private readonly redundancyOracle: RedundancyOracle) {}

  async score(ctx: ScoringContext): Promise<number> {
    // Novelty = 1 - maxSimilarity to any existing embedding
    const similarity = await this.redundancyOracle.computeNovelty(
      ctx.candidateId
    );
    return similarity;
  }

  async scoreBatch(contexts: ScoringContext[]): Promise<Map<UUID, number>> {
    const candidateIds = contexts.map((c) => c.candidateId);
    return this.redundancyOracle.computeNoveltyBatch(candidateIds);
  }
}
