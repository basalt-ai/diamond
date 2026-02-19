import type { UUID } from "@/shared/types";

import type { LabelType, LabelValue } from "../value-objects/LabelValue";

export interface LabelData {
  id: UUID;
  labelTaskId: UUID;
  annotatorId: UUID;
  labelType: LabelType;
  value: LabelValue;
  confidence: number;
  rationale: string | null;
  version: number;
  isCurrent: boolean;
  createdAt: Date;
}

export interface CreateLabelInput {
  label_task_id: string;
  annotator_id: string;
  label_type: LabelType;
  value: unknown;
  confidence: number;
  rationale?: string;
}
