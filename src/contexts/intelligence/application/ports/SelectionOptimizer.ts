import type { UUID } from "@/shared/types";

import type { SelectionConstraints } from "../../domain/entities/SelectionRun";
import type { ScoreVector } from "../../domain/value-objects/ScoreVector";

export interface SelectionCandidate {
  id: UUID;
  scores: ScoreVector;
  normalizedScores: ScoreVector;
  scenarioTypeId: UUID | null;
}

export interface SelectionRationale {
  candidateId: UUID;
  rank: number;
  marginalGain: number;
}

export interface SelectionResult {
  selected: SelectionRationale[];
  coverageImprovement: number;
}

export interface SelectionOptimizer {
  select(
    pool: SelectionCandidate[],
    constraints: SelectionConstraints
  ): SelectionResult;
}
