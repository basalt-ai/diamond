import type { UUID } from "@/shared/types";

import type {
  RefreshRunData,
  RefreshRunStatus,
  RefreshRunTrigger,
} from "../../domain/entities/RefreshRun";
import type { GraphChange } from "../../domain/services/VersionComputer";

export interface CreateRefreshRunParams {
  suiteId: UUID;
  triggeredBy: RefreshRunTrigger;
  triggerEventId: string;
  scenarioChanges: GraphChange[];
}

export interface ListRefreshRunsResult {
  data: RefreshRunData[];
  total: number;
}

export interface RefreshRunRepository {
  create(params: CreateRefreshRunParams): Promise<RefreshRunData>;
  findById(id: UUID): Promise<RefreshRunData | null>;
  listBySuite(
    suiteId: UUID,
    page: number,
    pageSize: number
  ): Promise<ListRefreshRunsResult>;
  updateStatus(
    id: UUID,
    status: RefreshRunStatus,
    updates?: {
      candidateCount?: number;
      datasetVersionId?: UUID;
      completedAt?: Date;
    }
  ): Promise<RefreshRunData>;
}
