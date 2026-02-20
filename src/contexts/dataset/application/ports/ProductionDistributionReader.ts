import type { UUID } from "@/shared/types";

export interface ProductionDistributionReader {
  getScenarioDistribution(days: number): Promise<Map<UUID, number>>;
  getTotalCandidateCount(days: number): Promise<number>;
}
