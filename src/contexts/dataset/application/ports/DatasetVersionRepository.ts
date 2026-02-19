import type { UUID } from "@/shared/types";

import type {
  DatasetVersionData,
  DatasetVersionState,
} from "../../domain/entities/DatasetVersion";
import type { GateResult } from "../../domain/value-objects/GateResult";
import type { LineageData } from "../../domain/value-objects/Lineage";

export interface ListVersionsFilter {
  suiteId?: UUID;
  state?: DatasetVersionState;
}

export interface ListVersionsResult {
  data: DatasetVersionData[];
  total: number;
}

export interface DatasetVersionRepository {
  create(params: {
    suiteId: UUID;
    version: string;
    scenarioGraphVersion: string;
    selectionPolicy: Record<string, unknown>;
    candidateIds: string[];
    lineage: LineageData | null;
  }): Promise<DatasetVersionData>;

  findById(id: UUID): Promise<DatasetVersionData | null>;

  findBySuiteAndVersion(
    suiteId: UUID,
    version: string
  ): Promise<DatasetVersionData | null>;

  list(
    filter: ListVersionsFilter,
    page: number,
    pageSize: number
  ): Promise<ListVersionsResult>;

  updateState(
    id: UUID,
    state: DatasetVersionState,
    updatedAt: Date,
    releasedAt?: Date
  ): Promise<DatasetVersionData>;

  updateDiagnostics(id: UUID, diagnosticsId: UUID): Promise<DatasetVersionData>;

  updateGateResults(
    id: UUID,
    gateResults: GateResult[],
    state: DatasetVersionState,
    updatedAt: Date,
    releasedAt?: Date
  ): Promise<DatasetVersionData>;
}
