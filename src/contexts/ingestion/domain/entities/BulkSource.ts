import type { UUID } from "@/shared/types";

export type BulkSourceStatus =
  | "pending"
  | "discovered"
  | "mapped"
  | "importing"
  | "completed"
  | "completed_with_errors"
  | "failed";

export interface ImportProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  deduplicated: number;
  startedAt: string | null;
  completedAt: string | null;
}

export interface ImportError {
  rowNumber: number;
  column?: string;
  error: string;
  value?: unknown;
}

export interface BulkSourceData {
  id: UUID;
  name: string;
  uri: string;
  format: string | null;
  status: BulkSourceStatus;
  sourceLabel: string;
  discoveredSchema: Record<string, unknown> | null;
  fieldMapping: Record<string, unknown> | null;
  fileChecksum: string | null;
  rowCount: number | null;
  importProgress: ImportProgress | null;
  errorLog: ImportError[] | null;
  createdAt: Date;
  updatedAt: Date;
}

const VALID_TRANSITIONS: Record<BulkSourceStatus, BulkSourceStatus[]> = {
  pending: ["discovered"],
  discovered: ["discovered", "mapped"],
  mapped: ["mapped", "importing"],
  importing: ["completed", "completed_with_errors", "failed"],
  completed: [],
  completed_with_errors: ["mapped"],
  failed: ["mapped"],
};

export function canTransition(
  from: BulkSourceStatus,
  to: BulkSourceStatus
): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
