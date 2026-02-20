import { manageCandidates } from "@/contexts/candidate";
import type { UUID } from "@/shared/types";

import type {
  CandidateInfo,
  CandidateReader,
} from "../application/ports/CandidateReader";

export class CandidateContextAdapter implements CandidateReader {
  async getMany(candidateIds: UUID[]): Promise<CandidateInfo[]> {
    if (candidateIds.length === 0) return [];
    const candidates = await manageCandidates.getMany(candidateIds);
    return candidates.map((c) => ({
      id: c.id,
      episodeId: c.episodeId,
      scenarioTypeId: c.scenarioTypeId,
      state: c.state,
    }));
  }

  async isInState(candidateId: UUID, states: string[]): Promise<boolean> {
    try {
      const candidate = await manageCandidates.get(candidateId);
      return states.includes(candidate.state);
    } catch {
      return false;
    }
  }
}
