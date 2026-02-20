import type { UUID } from "@/shared/types";

export interface EvalResultData {
  candidateId: UUID;
  passed: boolean;
  score: number | null;
  judgeOutput: Record<string, unknown> | null;
  failureMode: string | null;
}

export interface EvalRunData {
  id: UUID;
  datasetVersionId: UUID;
  modelName: string;
  modelVersion: string;
  evalRunExternalId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
