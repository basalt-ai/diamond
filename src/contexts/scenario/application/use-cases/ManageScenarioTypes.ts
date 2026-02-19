import type { UUID } from "@/shared/types";

import type {
  CreateScenarioTypeInput,
  ListScenarioTypesFilter,
  ScenarioTypeData,
  ScenarioTypeWithRelations,
  UpdateScenarioTypeInput,
} from "../../domain/entities/ScenarioType";
import { CycleDetectedError } from "../../domain/errors";
import type { GraphVersioningService } from "../GraphVersioningService";
import type { ScenarioRepository } from "../ports/ScenarioRepository";

export class ManageScenarioTypes {
  constructor(
    private readonly repo: ScenarioRepository,
    private readonly graphVersioning: GraphVersioningService
  ) {}

  async create(
    input: CreateScenarioTypeInput
  ): Promise<ScenarioTypeWithRelations> {
    const result = await this.repo.createScenarioType(input);
    await this.graphVersioning.createVersionAfterChange([
      {
        changeType: "added",
        entityType: "scenario_type",
        entityId: result.id,
        summary: `Added scenario type "${result.name}"`,
      },
    ]);
    return result;
  }

  async get(id: UUID): Promise<ScenarioTypeWithRelations> {
    return this.repo.getScenarioType(id);
  }

  async list(filter?: ListScenarioTypesFilter): Promise<ScenarioTypeData[]> {
    return this.repo.listScenarioTypes(filter);
  }

  async update(
    id: UUID,
    input: UpdateScenarioTypeInput
  ): Promise<ScenarioTypeWithRelations> {
    if (input.parentId !== undefined && input.parentId !== null) {
      await this.validateNoCycle(id, input.parentId as UUID);
    }
    const result = await this.repo.updateScenarioType(id, input);
    await this.graphVersioning.createVersionAfterChange([
      {
        changeType: "modified",
        entityType: "scenario_type",
        entityId: id,
        summary: `Updated scenario type "${result.name}"`,
      },
    ]);
    return result;
  }

  async archive(id: UUID): Promise<ScenarioTypeData> {
    const result = await this.repo.archiveScenarioType(id);
    await this.graphVersioning.createVersionAfterChange([
      {
        changeType: "archived",
        entityType: "scenario_type",
        entityId: id,
        summary: `Archived scenario type "${result.name}"`,
      },
    ]);
    return result;
  }

  private async validateNoCycle(
    nodeId: UUID,
    newParentId: UUID
  ): Promise<void> {
    if (nodeId === newParentId) {
      throw new CycleDetectedError(nodeId, newParentId);
    }
    const ancestorIds = await this.repo.getAncestorIds(newParentId);
    if (ancestorIds.includes(nodeId)) {
      throw new CycleDetectedError(nodeId, newParentId);
    }
  }
}
