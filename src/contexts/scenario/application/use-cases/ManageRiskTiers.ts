import type { UUID } from "@/shared/types";

import type {
  CreateRiskTierInput,
  RiskTierData,
  UpdateRiskTierInput,
} from "../../domain/entities/RiskTier";
import { ReferenceIntegrityError } from "../../domain/errors";
import type { GraphVersioningService } from "../GraphVersioningService";
import type { ScenarioRepository } from "../ports/ScenarioRepository";

export class ManageRiskTiers {
  constructor(
    private readonly repo: ScenarioRepository,
    private readonly graphVersioning: GraphVersioningService
  ) {}

  async create(input: CreateRiskTierInput): Promise<RiskTierData> {
    const result = await this.repo.createRiskTier(input);
    await this.graphVersioning.createVersionAfterChange([
      {
        changeType: "added",
        entityType: "risk_tier",
        entityId: result.id,
        summary: `Added risk tier "${result.name}"`,
      },
    ]);
    return result;
  }

  async get(id: UUID): Promise<RiskTierData> {
    return this.repo.getRiskTier(id);
  }

  async list(): Promise<RiskTierData[]> {
    return this.repo.listRiskTiers();
  }

  async update(id: UUID, input: UpdateRiskTierInput): Promise<RiskTierData> {
    const result = await this.repo.updateRiskTier(id, input);
    await this.graphVersioning.createVersionAfterChange([
      {
        changeType: "modified",
        entityType: "risk_tier",
        entityId: id,
        summary: `Updated risk tier "${result.name}"`,
      },
    ]);
    return result;
  }

  async delete(id: UUID): Promise<void> {
    const referenced = await this.repo.isRiskTierReferenced(id);
    if (referenced) {
      throw new ReferenceIntegrityError("RiskTier", id, "ScenarioType");
    }
    await this.repo.deleteRiskTier(id);
    await this.graphVersioning.createVersionAfterChange([
      {
        changeType: "removed",
        entityType: "risk_tier",
        entityId: id,
        summary: `Removed risk tier ${id}`,
      },
    ]);
  }
}
