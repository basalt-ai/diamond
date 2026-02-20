import { manageLabelTasks, manageLabels } from "@/contexts/labeling";
import type { UUID } from "@/shared/types";

import type {
  LabelDataReader,
  LabelExportView,
} from "../application/ports/LabelDataReader";

export class LabelContextAdapter implements LabelDataReader {
  async getLabelsForCandidates(
    candidateIds: UUID[]
  ): Promise<LabelExportView[]> {
    const results: LabelExportView[] = [];

    for (const candidateId of candidateIds) {
      try {
        const { data: tasks } = await manageLabelTasks.list(
          { candidateId },
          1,
          100
        );

        for (const task of tasks) {
          const { data: labels } = await manageLabels.listByTaskId(
            task.id,
            1,
            100
          );
          for (const label of labels) {
            results.push({
              candidateId,
              labelTaskId: task.id,
              annotatorId: label.annotatorId,
              value: label.value as Record<string, unknown>,
            });
          }
        }
      } catch {
        // Skip candidates without labels
      }
    }

    return results;
  }
}
