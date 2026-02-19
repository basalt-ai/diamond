import { eventBus } from "@/lib/events/InProcessEventBus";
import { generateId } from "@/shared/ids";

import type { GraphChange } from "../domain/entities/ScenarioGraph";
import type { GraphRepository } from "./ports/GraphRepository";

export class GraphVersioningService {
  constructor(private readonly graphRepo: GraphRepository) {}

  async createVersionAfterChange(changes: GraphChange[]): Promise<void> {
    const previousVersion = await this.graphRepo.getCurrentVersion();
    const snapshot = await this.graphRepo.buildSnapshot();
    const graphVersion = await this.graphRepo.createVersion(snapshot, changes);

    await eventBus.publish({
      eventId: generateId(),
      eventType: "scenario_graph.updated",
      aggregateId: graphVersion.id,
      occurredAt: new Date(),
      payload: {
        previousVersion,
        newVersion: graphVersion.version,
        changes,
      },
    });
  }
}
