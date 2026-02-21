import type { UUID } from "@/shared/types";

import type { ScenarioTypeCreator } from "../../application/ports/ScenarioTypeCreator";

export class ScenarioContextAdapter implements ScenarioTypeCreator {
  async create(input: {
    name: string;
    description: string;
    riskTierId: UUID;
    needsReview: boolean;
    failureModeIds?: UUID[];
    contextProfileIds?: UUID[];
  }): Promise<{ id: UUID }> {
    const { manageScenarioTypes } = await import("@/contexts/scenario");
    const result = await manageScenarioTypes.create({
      name: input.name,
      description: input.description,
      riskTierId: input.riskTierId,
      needsReview: input.needsReview,
      failureModeIds: input.failureModeIds,
      contextProfileIds: input.contextProfileIds,
    });
    return { id: result.id };
  }

  async findOrCreateRiskTier(
    category: "business" | "safety" | "compliance"
  ): Promise<{ id: UUID; name: string }> {
    const { manageRiskTiers } = await import("@/contexts/scenario");
    const tiers = await manageRiskTiers.list();
    const match = tiers.find((t) => t.category === category);
    if (match) return { id: match.id, name: match.name };

    const defaults: Record<
      string,
      {
        name: string;
        weight: number;
        category: "business" | "safety" | "compliance";
      }
    > = {
      business: { name: "business_default", weight: 0.5, category: "business" },
      safety: { name: "safety_default", weight: 0.9, category: "safety" },
      compliance: {
        name: "compliance_default",
        weight: 0.7,
        category: "compliance",
      },
    };

    const def = defaults[category]!;
    const created = await manageRiskTiers.create({
      name: def.name,
      weight: def.weight,
      category: def.category,
    });
    return { id: created.id, name: created.name };
  }

  async findOrCreateFailureMode(input: {
    name: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
  }): Promise<{ id: UUID }> {
    const { manageFailureModes } = await import("@/contexts/scenario");
    const existing = await manageFailureModes.list();
    const match = existing.find(
      (fm) => fm.name.toLowerCase() === input.name.toLowerCase()
    );
    if (match) return { id: match.id };

    const created = await manageFailureModes.create({
      name: input.name,
      description: input.description,
      severity: input.severity,
    });
    return { id: created.id };
  }

  async findOrCreateContextProfile(input: {
    name: string;
    attributes: Record<string, unknown>;
  }): Promise<{ id: UUID }> {
    const { manageContextProfiles } = await import("@/contexts/scenario");
    const existing = await manageContextProfiles.list();
    const match = existing.find(
      (cp) => cp.name.toLowerCase() === input.name.toLowerCase()
    );
    if (match) return { id: match.id };

    const created = await manageContextProfiles.create({
      name: input.name,
      attributes: input.attributes,
    });
    return { id: created.id };
  }
}
