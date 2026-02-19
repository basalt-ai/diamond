import type { UUID } from "@/shared/types";

import type {
  LabelReader,
  LabelSummary,
} from "../application/ports/LabelReader";

export class LabelContextAdapter implements LabelReader {
  async getLabelsForCandidates(
    candidateIds: UUID[]
  ): Promise<Map<UUID, LabelSummary[]>> {
    const { manageLabelTasks, manageLabels } =
      await import("@/contexts/labeling");
    const result = new Map<UUID, LabelSummary[]>();

    for (const candidateId of candidateIds) {
      try {
        const { data: tasks } = await manageLabelTasks.list(
          { candidateId },
          1,
          100
        );
        const summaries: LabelSummary[] = [];

        for (const task of tasks) {
          const { data: labels } = await manageLabels.listByTaskId(
            task.id,
            1,
            100
          );
          for (const label of labels) {
            summaries.push({
              labelTaskId: task.id,
              labelValue: label.value,
              annotatorId: label.annotatorId,
            });
          }
        }

        if (summaries.length > 0) {
          result.set(candidateId, summaries);
        }
      } catch {
        // Skip candidates without labels
      }
    }

    return result;
  }
}
