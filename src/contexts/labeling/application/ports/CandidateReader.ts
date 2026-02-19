import type { UUID } from "@/shared/types";

export interface CandidateReader {
	get(
		candidateId: UUID,
	): Promise<{
		id: UUID;
		state: string;
		scenario_type_id: UUID;
	} | null>;

	isInState(candidateId: UUID, state: string): Promise<boolean>;
}
