import type { UUID } from "@/shared/types";

export interface CandidateReader {
  get(candidateId: UUID): Promise<{
    id: UUID;
    state: string;
    scenario_type_id: UUID | null;
  } | null>;

  isInState(candidateId: UUID, state: string): Promise<boolean>;

  listByState(
    state: string,
    scenarioTypeId?: UUID
  ): Promise<Array<{ id: UUID; scenario_type_id: UUID | null }>>;
}
