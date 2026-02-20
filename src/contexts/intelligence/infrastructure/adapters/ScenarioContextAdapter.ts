import type { UUID } from "@/shared/types";

import type { ScenarioTypeCreator } from "../../application/ports/ScenarioTypeCreator";

export class ScenarioContextAdapter implements ScenarioTypeCreator {
  async create(input: {
    name: string;
    description: string;
    riskTierId: UUID;
    needsReview: boolean;
  }): Promise<{ id: UUID }> {
    const { manageScenarioTypes } = await import("@/contexts/scenario");
    const result = await manageScenarioTypes.create({
      name: input.name,
      description: input.description,
      riskTierId: input.riskTierId,
      needsReview: input.needsReview,
    });
    return { id: result.id };
  }

  async findRiskTierByCategory(
    category: "business" | "safety" | "compliance"
  ): Promise<{ id: UUID; name: string } | null> {
    const { manageRiskTiers } = await import("@/contexts/scenario");
    const tiers = await manageRiskTiers.list();
    const match = tiers.find((t) => t.category === category);
    return match ? { id: match.id, name: match.name } : null;
  }
}
