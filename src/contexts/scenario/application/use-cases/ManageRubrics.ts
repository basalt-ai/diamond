import { eventBus } from "@/lib/events/InProcessEventBus";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import type {
  CreateRubricInput,
  RubricData,
} from "../../domain/entities/Rubric";
import type { RubricRepository } from "../ports/RubricRepository";
import type { ScenarioRepository } from "../ports/ScenarioRepository";

export class ManageRubrics {
  constructor(
    private readonly rubricRepo: RubricRepository,
    private readonly scenarioRepo: ScenarioRepository
  ) {}

  async createVersion(input: CreateRubricInput): Promise<RubricData> {
    // Verify scenario type exists
    await this.scenarioRepo.getScenarioType(input.scenarioTypeId as UUID);

    let previousVersion: number | null = null;
    try {
      const latest = await this.rubricRepo.getLatest(
        input.scenarioTypeId as UUID
      );
      previousVersion = latest.version;
    } catch {
      // No existing version — this is the first
    }

    const rubric = await this.rubricRepo.createVersion(input);

    await eventBus.publish({
      eventId: generateId(),
      eventType: "rubric.version_created",
      aggregateId: rubric.id,
      occurredAt: new Date(),
      payload: {
        rubricId: rubric.id,
        scenarioTypeId: rubric.scenarioTypeId,
        previousVersion,
        newVersion: rubric.version,
        changeSummary: `Rubric v${String(rubric.version)} created for scenario type ${rubric.scenarioTypeId}`,
      },
    });

    return rubric;
  }

  async getById(id: UUID): Promise<RubricData> {
    return this.rubricRepo.getById(id);
  }

  async listVersions(scenarioTypeId: UUID): Promise<RubricData[]> {
    return this.rubricRepo.listVersions(scenarioTypeId);
  }

  async getByVersion(
    scenarioTypeId: UUID,
    version: number
  ): Promise<RubricData> {
    return this.rubricRepo.getByVersion(scenarioTypeId, version);
  }

  async getEffectiveRubrics(scenarioTypeId: UUID): Promise<RubricData[]> {
    // Walk up the tree collecting rubrics (first found wins per scenario type)
    let currentId: UUID | null = scenarioTypeId;
    const rubrics: RubricData[] = [];

    while (currentId) {
      try {
        const latest = await this.rubricRepo.getLatest(currentId);
        rubrics.push(latest);
        // Found a rubric — stop traversal (first-found wins)
        break;
      } catch {
        // No rubric at this level, walk up
      }

      const scenarioType = await this.scenarioRepo.getScenarioType(currentId);
      currentId = scenarioType.parentId;
    }

    return rubrics;
  }
}
