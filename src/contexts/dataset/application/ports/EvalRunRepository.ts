import type { UUID } from "@/shared/types";

import type {
  EvalResultData,
  EvalRunData,
} from "../../domain/entities/EvalRun";

export interface CreateEvalRunParams {
  datasetVersionId: UUID;
  modelName: string;
  modelVersion: string;
  evalRunExternalId: string | null;
  metadata: Record<string, unknown>;
  results: EvalResultData[];
}

export interface ListEvalRunsFilter {
  datasetVersionId?: UUID;
  modelName?: string;
  modelVersion?: string;
}

export interface EvalRunWithStats extends EvalRunData {
  totalResults: number;
  passedCount: number;
  passRate: number;
}

export interface EvalResultRow {
  id: UUID;
  evalRunId: UUID;
  candidateId: UUID;
  passed: boolean;
  score: number | null;
  judgeOutput: Record<string, unknown> | null;
  failureMode: string | null;
}

export interface EvalRunRepository {
  createWithResults(params: CreateEvalRunParams): Promise<EvalRunData>;
  findById(id: UUID): Promise<EvalRunData | null>;
  findByExternalId(
    datasetVersionId: UUID,
    modelName: string,
    modelVersion: string,
    externalId: string
  ): Promise<EvalRunData | null>;
  list(
    filter: ListEvalRunsFilter,
    page: number,
    pageSize: number
  ): Promise<{ data: EvalRunWithStats[]; total: number }>;
  getResultsByRunId(
    runId: UUID,
    page: number,
    pageSize: number
  ): Promise<{ data: EvalResultRow[]; total: number }>;
  getResultsByVersionId(versionId: UUID): Promise<EvalResultRow[]>;
}
