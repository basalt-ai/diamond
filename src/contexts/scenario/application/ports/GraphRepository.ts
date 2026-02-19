import type { UUID } from "@/shared/types";

import type {
  GraphChange,
  GraphSnapshot,
  ScenarioGraphVersionData,
} from "../../domain/entities/ScenarioGraph";

export interface GraphRepository {
  getCurrentVersion(): Promise<number>;
  createVersion(
    snapshot: GraphSnapshot,
    changes: GraphChange[]
  ): Promise<ScenarioGraphVersionData>;
  getLatest(): Promise<ScenarioGraphVersionData>;
  getByVersion(version: number): Promise<ScenarioGraphVersionData>;
  listVersions(
    limit?: number,
    offset?: number
  ): Promise<{
    data: ScenarioGraphVersionData[];
    total: number;
  }>;
  buildSnapshot(): Promise<GraphSnapshot>;
}
