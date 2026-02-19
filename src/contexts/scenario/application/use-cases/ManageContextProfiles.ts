import type { UUID } from "@/shared/types";

import type {
  ContextProfileData,
  CreateContextProfileInput,
  UpdateContextProfileInput,
} from "../../domain/entities/ContextProfile";
import { ReferenceIntegrityError } from "../../domain/errors";
import type { GraphVersioningService } from "../GraphVersioningService";
import type { ScenarioRepository } from "../ports/ScenarioRepository";

export class ManageContextProfiles {
  constructor(
    private readonly repo: ScenarioRepository,
    private readonly graphVersioning: GraphVersioningService
  ) {}

  async create(input: CreateContextProfileInput): Promise<ContextProfileData> {
    const result = await this.repo.createContextProfile(input);
    await this.graphVersioning.createVersionAfterChange([
      {
        changeType: "added",
        entityType: "context_profile",
        entityId: result.id,
        summary: `Added context profile "${result.name}"`,
      },
    ]);
    return result;
  }

  async get(id: UUID): Promise<ContextProfileData> {
    return this.repo.getContextProfile(id);
  }

  async list(): Promise<ContextProfileData[]> {
    return this.repo.listContextProfiles();
  }

  async update(
    id: UUID,
    input: UpdateContextProfileInput
  ): Promise<ContextProfileData> {
    const result = await this.repo.updateContextProfile(id, input);
    await this.graphVersioning.createVersionAfterChange([
      {
        changeType: "modified",
        entityType: "context_profile",
        entityId: id,
        summary: `Updated context profile "${result.name}"`,
      },
    ]);
    return result;
  }

  async delete(id: UUID): Promise<void> {
    const referenced = await this.repo.isContextProfileReferenced(id);
    if (referenced) {
      throw new ReferenceIntegrityError("ContextProfile", id, "ScenarioType");
    }
    await this.repo.deleteContextProfile(id);
    await this.graphVersioning.createVersionAfterChange([
      {
        changeType: "removed",
        entityType: "context_profile",
        entityId: id,
        summary: `Removed context profile ${id}`,
      },
    ]);
  }
}
