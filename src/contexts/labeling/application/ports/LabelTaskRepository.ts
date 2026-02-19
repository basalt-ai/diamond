import type { UUID } from "@/shared/types";

import type {
  LabelTaskData,
  LabelTaskState,
} from "../../domain/entities/LabelTask";

export interface ListLabelTasksFilter {
  state?: LabelTaskState;
  assignedTo?: UUID;
  candidateId?: UUID;
  scenarioTypeId?: UUID;
}

export interface LabelTaskRepository {
  insert(data: LabelTaskData): Promise<LabelTaskData>;

  findById(id: UUID): Promise<LabelTaskData | null>;

  update(id: UUID, updates: Partial<LabelTaskData>): Promise<LabelTaskData>;

  list(
    filter: ListLabelTasksFilter,
    page: number,
    pageSize: number
  ): Promise<{ data: LabelTaskData[]; total: number }>;
}
