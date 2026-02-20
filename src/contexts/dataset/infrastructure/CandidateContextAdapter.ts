import { manageCandidates } from "@/contexts/candidate";
import type { UUID } from "@/shared/types";

import type {
  CandidateInfo,
  CandidateReader,
} from "../application/ports/CandidateReader";

export class CandidateContextAdapter implements CandidateReader {
  async getMany(candidateIds: UUID[]): Promise<CandidateInfo[]> {
    const results: CandidateInfo[] = [];
    for (const id of candidateIds) {
      try {
        const candidate = await manageCandidates.get(id);
        results.push({
          id: candidate.id,
          episodeId: candidate.episodeId,
          scenarioTypeId: candidate.scenarioTypeId,
          state: candidate.state,
        });
      } catch {
        // Skip not-found candidates
      }
    }
    return results;
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
