import { DuplicateError, NotFoundError } from "@/lib/domain/DomainError";
import type { DomainEvent } from "@/lib/events/DomainEvent";
import type { UUID } from "@/shared/types";

export async function onDatasetVersionReleased(
  event: DomainEvent
): Promise<void> {
  const { dataset_version_id } = event.payload as {
    dataset_version_id: string;
  };
  try {
    const { manageExports } = await import("@/contexts/export");
    await manageExports.create({
      dataset_version_id: dataset_version_id as UUID as string,
      format: "jsonl",
    });
  } catch (error) {
    if (error instanceof DuplicateError) return;
    if (error instanceof NotFoundError) return;
    throw error;
  }
}
