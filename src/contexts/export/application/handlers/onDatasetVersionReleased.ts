import { DuplicateError, NotFoundError } from "@/lib/domain/DomainError";
import type { DomainEvent } from "@/lib/events/DomainEvent";

import { manageExports } from "../../index";

export async function onDatasetVersionReleased(
  event: DomainEvent
): Promise<void> {
  const { dataset_version_id } = event.payload as {
    dataset_version_id: string;
  };
  try {
    await manageExports.create({
      dataset_version_id: dataset_version_id as string,
      format: "jsonl",
    });
  } catch (error) {
    if (error instanceof DuplicateError) return;
    if (error instanceof NotFoundError) return;
    throw error;
  }
}
