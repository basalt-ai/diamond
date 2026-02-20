import { DuplicateError } from "@/lib/domain/DomainError";
import type { DomainEvent } from "@/lib/events/DomainEvent";
import type { UUID } from "@/shared/types";

import { candidateReader, manageLabelTasks } from "../../index";

export async function onRubricVersionCreated(
  event: DomainEvent
): Promise<void> {
  const { rubricId, scenarioTypeId } = event.payload as {
    rubricId: string;
    scenarioTypeId: string;
  };

  const candidates = await candidateReader.listByState(
    "selected",
    scenarioTypeId as UUID
  );

  for (const candidate of candidates) {
    try {
      await manageLabelTasks.create({
        candidate_id: candidate.id,
        rubric_id: rubricId,
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
