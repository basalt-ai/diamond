import { DuplicateError } from "@/lib/domain/DomainError";
import type { DomainEvent } from "@/lib/events/DomainEvent";

import { manageCandidates } from "../../index";

export async function onEpisodeIngested(event: DomainEvent): Promise<void> {
  const { episode_id, scenario_type_id } = event.payload as {
    episode_id: string;
    scenario_type_id?: string;
  };

  try {
    await manageCandidates.create({
      episode_id,
      scenario_type_id,
    });
  } catch (error) {
    if (error instanceof DuplicateError) {
      // Idempotent: candidate already exists for this episode
      return;
    }
    throw error;
  }
}
