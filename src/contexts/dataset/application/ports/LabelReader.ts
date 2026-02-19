import type { UUID } from "@/shared/types";

export interface LabelSummary {
  labelTaskId: UUID;
  labelValue: unknown;
  annotatorId: string;
}

export interface LabelReader {
  getLabelsForCandidates(
    candidateIds: UUID[]
  ): Promise<Map<UUID, LabelSummary[]>>;
}
