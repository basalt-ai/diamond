import type { UUID } from "@/shared/types";

export interface CandidateExportView {
  id: UUID;
  episodeId: string;
  scenarioTypeId: string | null;
}

export interface CandidateDataReader {
  getMany(candidateIds: UUID[]): Promise<CandidateExportView[]>;
}
