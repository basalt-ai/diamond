import type { UUID } from "@/shared/types";

export interface SliceData {
  id: UUID;
  datasetVersionId: UUID;
  name: string;
  filter: Record<string, unknown>;
  candidateIds: string[];
  isGolden: boolean;
  lockedAt: Date | null;
  staleCandidateIds: string[] | null;
  createdAt: Date;
}
