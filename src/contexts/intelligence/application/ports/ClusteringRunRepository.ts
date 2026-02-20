import type { UUID } from "@/shared/types";

import type { ClusteringRun } from "../../domain/entities/ClusteringRun";

export interface ClusteringRunRepository {
  save(run: ClusteringRun): Promise<void>;
  findById(id: UUID): Promise<ClusteringRun | null>;
  list(options?: { limit?: number; offset?: number }): Promise<ClusteringRun[]>;
  count(): Promise<number>;
  updateClusterScenarioTypeId(
    clusterId: UUID,
    scenarioTypeId: UUID
  ): Promise<void>;
}
