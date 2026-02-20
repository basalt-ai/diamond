import type { UUID } from "@/shared/types";

import type { FeatureSet } from "../../domain/value-objects/FeatureSet";
import type {
  ScoreDimension,
  ScoreVector,
} from "../../domain/value-objects/ScoreVector";

export interface ScoringContext {
  candidateId: UUID;
  episodeId: UUID;
  features: FeatureSet;
  embedding: ReadonlyArray<number>;
  scenarioTypeId: UUID | null;
  mappingConfidence: number;
}

export interface DimensionScorer {
  readonly dimension: ScoreDimension;
  score(ctx: ScoringContext): Promise<number>;
  scoreBatch?(contexts: ScoringContext[]): Promise<Map<UUID, number>>;
}

export interface ScoringEngine {
  score(ctx: ScoringContext): Promise<ScoreVector>;
  scoreBatch(contexts: ScoringContext[]): Promise<Map<UUID, ScoreVector>>;
}
