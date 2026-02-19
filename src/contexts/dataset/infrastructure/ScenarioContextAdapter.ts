import type { ScenarioReader } from "../application/ports/ScenarioReader";

export class ScenarioContextAdapter implements ScenarioReader {
  async getLatestGraphVersion(): Promise<string> {
    const { readScenarioGraph } = await import("@/contexts/scenario");
    const current = await readScenarioGraph.getCurrent();
    return String(current.version);
  }
}
