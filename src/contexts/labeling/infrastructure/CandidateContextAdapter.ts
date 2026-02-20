import { manageCandidates } from "@/contexts/candidate";
import type { CandidateState } from "@/contexts/candidate/domain/entities/Candidate";
import { NotFoundError } from "@/lib/domain/DomainError";
import type { UUID } from "@/shared/types";

import type { CandidateReader } from "../application/ports/CandidateReader";

export class CandidateContextAdapter implements CandidateReader {
  async get(candidateId: UUID): Promise<{
    id: UUID;
    state: string;
    scenario_type_id: UUID | null;
  } | null> {
    try {
      const candidate = await manageCandidates.get(candidateId);
      return {
        id: candidate.id,
        state: candidate.state,
        scenario_type_id: candidate.scenarioTypeId,
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

  async listByState(
    state: string,
    scenarioTypeId?: UUID
  ): Promise<Array<{ id: UUID; scenario_type_id: UUID | null }>> {
    const result = await manageCandidates.list(
      {
        state: state as CandidateState,
        scenarioTypeId,
      },
      1,
      1000
    );
    return result.data.map((c) => ({
      id: c.id,
      scenario_type_id: c.scenarioTypeId,
    }));
  }
}
