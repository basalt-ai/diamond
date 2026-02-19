import type { UUID } from "@/shared/types";

import type {
  CreateFailureModeInput,
  FailureModeData,
  UpdateFailureModeInput,
} from "../../domain/entities/FailureMode";
import { ReferenceIntegrityError } from "../../domain/errors";
import type { GraphVersioningService } from "../GraphVersioningService";
import type { ScenarioRepository } from "../ports/ScenarioRepository";

export class ManageFailureModes {
  constructor(
    private readonly repo: ScenarioRepository,
    private readonly graphVersioning: GraphVersioningService
  ) {}

  async create(input: CreateFailureModeInput): Promise<FailureModeData> {
    const result = await this.repo.createFailureMode(input);
    await this.graphVersioning.createVersionAfterChange([
      {
        changeType: "added",
        entityType: "failure_mode",
        entityId: result.id,
        summary: `Added failure mode "${result.name}"`,
      },
    ]);
    return result;
  }

  async get(id: UUID): Promise<FailureModeData> {
    return this.repo.getFailureMode(id);
  }

  async list(): Promise<FailureModeData[]> {
    return this.repo.listFailureModes();
  }

  async update(
    id: UUID,
    input: UpdateFailureModeInput
  ): Promise<FailureModeData> {
    const result = await this.repo.updateFailureMode(id, input);
    await this.graphVersioning.createVersionAfterChange([
      {
        changeType: "modified",
        entityType: "failure_mode",
        entityId: id,
        summary: `Updated failure mode "${result.name}"`,
      },
    ]);
    return result;
  }

  async delete(id: UUID): Promise<void> {
    const referenced = await this.repo.isFailureModeReferenced(id);
    if (referenced) {
      throw new ReferenceIntegrityError("FailureMode", id, "ScenarioType");
    }
    await this.repo.deleteFailureMode(id);
    await this.graphVersioning.createVersionAfterChange([
      {
        changeType: "removed",
        entityType: "failure_mode",
        entityId: id,
        summary: `Removed failure mode ${id}`,
      },
    ]);
  }
}
