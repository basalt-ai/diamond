import {
  InvalidStateTransitionError,
  NotFoundError,
} from "@/lib/domain/DomainError";
import type { DomainEvent } from "@/lib/events/DomainEvent";
import type { UUID } from "@/shared/types";

import { manageCandidates } from "../../index";

export async function onLabelTaskFinalized(event: DomainEvent): Promise<void> {
  const { candidate_id } = event.payload as { candidate_id: string };

  try {
    await manageCandidates.transition(candidate_id as UUID, "labeled");
  } catch (error) {
    if (
      error instanceof NotFoundError ||
      error instanceof InvalidStateTransitionError
    ) {
      // Idempotent: candidate not found or not in expected state — skip
      console.warn(
        `[onLabelTaskFinalized] Skipping: ${(error as Error).message}`
      );
      return;
    }
    throw error;
  }
}
