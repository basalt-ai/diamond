import type { UUID } from "@/shared/types";

export interface CandidateInfo {
  id: UUID;
  episodeId: UUID;
  scenarioTypeId: UUID | null;
  state: string;
}

export interface CandidateReader {
  getMany(candidateIds: UUID[]): Promise<CandidateInfo[]>;
  isInState(candidateId: UUID, states: string[]): Promise<boolean>;
}
