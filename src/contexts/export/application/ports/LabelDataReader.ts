import type { UUID } from "@/shared/types";

export interface LabelExportView {
  candidateId: UUID;
  labelTaskId: UUID;
  annotatorId: string;
  value: Record<string, unknown>;
}

export interface LabelDataReader {
  getLabelsForCandidates(candidateIds: UUID[]): Promise<LabelExportView[]>;
}
