import type { UUID } from "@/shared/types";

export interface ScenarioTypeCreator {
  create(input: {
    name: string;
    description: string;
    riskTierId: UUID;
    needsReview: boolean;
  }): Promise<{ id: UUID }>;
  findRiskTierByCategory(
    category: "business" | "safety" | "compliance"
  ): Promise<{ id: UUID; name: string } | null>;
}
