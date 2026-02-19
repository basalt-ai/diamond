import type { UUID } from "@/shared/types";

import type { LabelData } from "../../domain/entities/Label";

export interface LabelRepository {
  insert(data: LabelData): Promise<LabelData>;

  findById(id: UUID): Promise<LabelData | null>;

  listByTaskId(
    taskId: UUID,
    page: number,
    pageSize: number
  ): Promise<{ data: LabelData[]; total: number }>;

  countByTaskId(taskId: UUID): Promise<number>;

  getCurrentByTaskId(taskId: UUID): Promise<LabelData[]>;

  markPreviousVersionsNotCurrent(
    taskId: UUID,
    annotatorId: UUID
  ): Promise<void>;
}
