import type { UUID } from "@/shared/types";

export type Severity = "low" | "medium" | "high" | "critical";

export interface FailureModeData {
  id: UUID;
  name: string;
  description: string;
  severity: Severity;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateFailureModeInput = {
  name: string;
  description?: string;
  severity: Severity;
};

export type UpdateFailureModeInput = {
  name?: string;
  description?: string;
  severity?: Severity;
};
