import type { UUID } from "@/shared/types";

export interface ScenarioTypeCreator {
  create(input: {
    name: string;
    description: string;
    riskTierId: UUID;
    needsReview: boolean;
    failureModeIds?: UUID[];
    contextProfileIds?: UUID[];
  }): Promise<{ id: UUID }>;
  findRiskTierByCategory(
    category: "business" | "safety" | "compliance"
  ): Promise<{ id: UUID; name: string } | null>;
  findOrCreateFailureMode(input: {
    name: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
  }): Promise<{ id: UUID }>;
  findOrCreateContextProfile(input: {
    name: string;
    attributes: Record<string, unknown>;
  }): Promise<{ id: UUID }>;
}
