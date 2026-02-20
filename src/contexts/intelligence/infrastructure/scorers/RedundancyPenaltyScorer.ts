import type { UUID } from "@/shared/types";

import type { RedundancyOracle } from "../../application/ports/RedundancyOracle";
import type {
  DimensionScorer,
  ScoringContext,
} from "../../application/ports/ScoringEngine";

export class RedundancyPenaltyScorer implements DimensionScorer {
  readonly dimension = "redundancyPenalty" as const;

  constructor(private readonly redundancyOracle: RedundancyOracle) {}

  async score(ctx: ScoringContext): Promise<number> {
    return this.redundancyOracle.computeRedundancy(ctx.candidateId, []);
  }

  async scoreBatch(contexts: ScoringContext[]): Promise<Map<UUID, number>> {
    const candidateIds = contexts.map((c) => c.candidateId);
    return this.redundancyOracle.computeRedundancyBatch(candidateIds, []);
  }
}
