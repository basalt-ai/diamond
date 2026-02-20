import type { UUID } from "@/shared/types";

export interface MappingResult {
  scenarioTypeId: UUID;
  confidence: number;
}

export interface ScenarioMapper {
  map(candidateId: UUID, embedding: number[]): Promise<MappingResult | null>;
  updateCentroids(): Promise<void>;
}
