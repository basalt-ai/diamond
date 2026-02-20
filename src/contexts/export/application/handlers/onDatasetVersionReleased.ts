import { DuplicateError, NotFoundError } from "@/lib/domain/DomainError";
import type { DomainEvent } from "@/lib/events/DomainEvent";

import { manageExports } from "../../index";

export async function onDatasetVersionReleased(
  event: DomainEvent
): Promise<void> {
  const { dataset_version_id, suite_id } = event.payload as {
    dataset_version_id: string;
    suite_id: string;
  };

  // Determine export formats: use suite's refresh policy formats if configured, else default to jsonl
  const formats = await getExportFormats(suite_id);

  for (const format of formats) {
    try {
      await manageExports.create({
        dataset_version_id,
        format: format as "jsonl",
      });
    } catch (error) {
      if (error instanceof DuplicateError) continue;
      if (error instanceof NotFoundError) continue;
      throw error;
    }
  }
}

async function getExportFormats(suiteId: string): Promise<string[]> {
  try {
    const { manageDatasetSuites } = await import("@/contexts/dataset");
    const suite = await manageDatasetSuites.get(suiteId as import("@/shared/types").UUID);
    const policyFormats = suite.refreshPolicy?.exportFormats;
    if (policyFormats && policyFormats.length > 0) return policyFormats;
  } catch {
    // Fall through to default
  }
  return ["jsonl"];
}
