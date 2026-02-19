import type { UUID } from "@/shared/types";

import type { ScenarioReader } from "../application/ports/ScenarioReader";

export class ScenarioContextAdapter implements ScenarioReader {
  async exists(scenarioTypeId: UUID): Promise<boolean> {
    // Import lazily to avoid circular dependency at module load time
    const { manageScenarioTypes } = await import("@/contexts/scenario");
    try {
      await manageScenarioTypes.get(scenarioTypeId);
      return true;
    } catch {
      return false;
    }
  }
}
