import { readScenarioGraph } from "@/contexts/scenario";

import type { ScenarioReader } from "../application/ports/ScenarioReader";

export class ScenarioContextAdapter implements ScenarioReader {
  async getLatestGraphVersion(): Promise<string> {
    const current = await readScenarioGraph.getCurrent();
    return String(current.version);
  }
}
