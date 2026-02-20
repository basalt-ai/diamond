import type { UUID } from "@/shared/types";

export interface CandidateMapper {
  mapToScenario(
    candidateIds: UUID[],
    scenarioTypeId: UUID,
    confidence: number
  ): Promise<void>;
}
