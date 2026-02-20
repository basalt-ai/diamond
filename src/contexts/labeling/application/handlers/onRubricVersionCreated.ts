import { DuplicateError } from "@/lib/domain/DomainError";
import type { DomainEvent } from "@/lib/events/DomainEvent";
import type { UUID } from "@/shared/types";

import { candidateReader, manageLabelTasks } from "../../index";

export async function onRubricVersionCreated(
  event: DomainEvent
): Promise<void> {
  const { rubric_id, scenario_type_id } = event.payload as {
    rubric_id: string;
    scenario_type_id: string;
  };

  const candidates = await candidateReader.listByState(
    "selected",
    scenario_type_id as UUID
  );

  for (const candidate of candidates) {
    try {
      await manageLabelTasks.create({
        candidate_id: candidate.id,
        rubric_id: rubric_id,
      });
    } catch (error) {
      if (error instanceof DuplicateError) continue;
      console.error(
        `[onRubricVersionCreated] Failed to create label task for candidate ${candidate.id}:`,
        error
      );
    }
  }
}
