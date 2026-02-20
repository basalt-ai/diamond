import { DuplicateError } from "@/lib/domain/DomainError";
import type { DomainEvent } from "@/lib/events/DomainEvent";
import type { UUID } from "@/shared/types";

import { manageLabelTasks, rubricReader } from "../../index";

export async function onCandidateSelected(event: DomainEvent): Promise<void> {
  const { candidate_id, to_state, scenario_type_id } = event.payload as {
    candidate_id: string;
    to_state: string;
    scenario_type_id: string | null;
  };

  if (to_state !== "selected") return;

  if (!scenario_type_id) {
    console.warn(
      `[onCandidateSelected] Candidate ${candidate_id} has no scenario_type_id, skipping label task creation`
    );
    return;
  }

  const rubric = await rubricReader.getLatestForScenarioType(
    scenario_type_id as UUID
  );
  if (!rubric) {
    console.warn(
      `[onCandidateSelected] No rubric found for scenario type ${scenario_type_id}, skipping label task creation for candidate ${candidate_id}`
    );
    return;
  }

  try {
    await manageLabelTasks.create({
      candidate_id,
      rubric_id: rubric.id,
    });
  } catch (error) {
    if (error instanceof DuplicateError) return;
    throw error;
  }
}
