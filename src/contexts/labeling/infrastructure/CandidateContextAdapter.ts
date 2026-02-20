import { manageCandidates } from "@/contexts/candidate";
import { NotFoundError } from "@/lib/domain/DomainError";
import type { UUID } from "@/shared/types";

import type { CandidateReader } from "../application/ports/CandidateReader";

export class CandidateContextAdapter implements CandidateReader {
  async get(candidateId: UUID): Promise<{
    id: UUID;
    state: string;
    scenario_type_id: UUID;
  } | null> {
    try {
      const candidate = await manageCandidates.get(candidateId);
      return {
        id: candidate.id,
        state: candidate.state,
        scenario_type_id: candidate.scenarioTypeId as UUID,
      };
    } catch (error) {
      if (error instanceof NotFoundError) return null;
      throw error;
    }
  }

  async isInState(candidateId: UUID, state: string): Promise<boolean> {
    const candidate = await this.get(candidateId);
    if (!candidate) return false;
    return candidate.state === state;
  }
}
