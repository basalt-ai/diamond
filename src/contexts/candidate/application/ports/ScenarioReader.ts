import type { UUID } from "@/shared/types";

export interface ScenarioReader {
  exists(scenarioTypeId: UUID): Promise<boolean>;
}
