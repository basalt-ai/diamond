import type { UUID } from "@/shared/types";

import type { ScenarioReader } from "../../application/ports/ScenarioReader";
import type {
  DimensionScorer,
  ScoringContext,
} from "../../application/ports/ScoringEngine";

const RISK_TIER_WEIGHTS: Record<string, number> = {
  critical: 1.0,
  high: 0.8,
  medium: 0.5,
  low: 0.2,
};

export class RiskWeightScorer implements DimensionScorer {
  readonly dimension = "riskWeight" as const;

  constructor(private readonly scenarioReader: ScenarioReader) {}

  async score(ctx: ScoringContext): Promise<number> {
    if (!ctx.scenarioTypeId) return 0.5;

    const scenarioType = await this.scenarioReader.findTypeById(
      ctx.scenarioTypeId
    );
    if (!scenarioType) return 0.5;

    return RISK_TIER_WEIGHTS[scenarioType.riskTier] ?? 0.5;
  }

  async scoreBatch(contexts: ScoringContext[]): Promise<Map<UUID, number>> {
    const typeCache = new Map<string, { riskTier: string } | null>();

    const results = new Map<UUID, number>();
    for (const ctx of contexts) {
      if (!ctx.scenarioTypeId) {
        results.set(ctx.candidateId, 0.5);
        continue;
      }

      if (!typeCache.has(ctx.scenarioTypeId)) {
        const st = await this.scenarioReader.findTypeById(ctx.scenarioTypeId);
        typeCache.set(ctx.scenarioTypeId, st);
      }

      const cached = typeCache.get(ctx.scenarioTypeId);
      results.set(
        ctx.candidateId,
        cached ? (RISK_TIER_WEIGHTS[cached.riskTier] ?? 0.5) : 0.5
      );
    }
    return results;
  }
}
