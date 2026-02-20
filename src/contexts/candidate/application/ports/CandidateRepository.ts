import type { UUID } from "@/shared/types";

import type {
  CandidateData,
  CandidateState,
} from "../../domain/entities/Candidate";

export interface ListCandidatesFilter {
  state?: CandidateState;
  scenarioTypeId?: UUID;
  episodeId?: UUID;
}

export interface ListCandidatesResult {
  data: CandidateData[];
  total: number;
}

export interface CandidateRepository {
  create(params: {
    episodeId: UUID;
    scenarioTypeId: UUID | null;
    mappingConfidence: number;
  }): Promise<CandidateData>;

  findById(id: UUID): Promise<CandidateData | null>;

  list(
    filter: ListCandidatesFilter,
    page: number,
    pageSize: number
  ): Promise<ListCandidatesResult>;

  updateState(id: UUID, state: CandidateState): Promise<CandidateData>;

  findByEpisodeId(episodeId: UUID): Promise<CandidateData | null>;

  updateWithScoring(
    id: UUID,
    data: {
      state: CandidateState;
      scores: Record<string, unknown>;
      features: Record<string, unknown>;
      scenarioTypeId: UUID | null;
      mappingConfidence: number;
    }
  ): Promise<void>;

  updateEmbedding(id: UUID, embeddedAt: Date): Promise<void>;
}
