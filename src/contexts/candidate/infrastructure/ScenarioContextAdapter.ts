import { manageScenarioTypes } from "@/contexts/scenario";
import type { UUID } from "@/shared/types";

import type { ScenarioReader } from "../application/ports/ScenarioReader";

export class ScenarioContextAdapter implements ScenarioReader {
  async exists(scenarioTypeId: UUID): Promise<boolean> {
    try {
      await manageScenarioTypes.get(scenarioTypeId);
      return true;
    } catch {
      return false;
    }
  }
}
