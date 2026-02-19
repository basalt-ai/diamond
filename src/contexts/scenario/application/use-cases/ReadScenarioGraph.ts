import type { ScenarioGraphVersionData } from "../../domain/entities/ScenarioGraph";
import type { GraphRepository } from "../ports/GraphRepository";

export class ReadScenarioGraph {
  constructor(private readonly graphRepo: GraphRepository) {}

  async getCurrent(): Promise<ScenarioGraphVersionData> {
    return this.graphRepo.getLatest();
  }

  async getByVersion(version: number): Promise<ScenarioGraphVersionData> {
    return this.graphRepo.getByVersion(version);
  }

  async listVersions(
    limit?: number,
    offset?: number
  ): Promise<{ data: ScenarioGraphVersionData[]; total: number }> {
    return this.graphRepo.listVersions(limit, offset);
  }
}
