import type { UUID } from "@/shared/types";

export interface DatasetCandidateSnapshot {
  candidateId: UUID;
  scenarioTypeId: UUID | null;
}

export interface DatasetReader {
  findCandidateIdsInCurrentDataset(): Promise<UUID[]>;
  findCandidateSnapshotsInCurrentDataset(): Promise<DatasetCandidateSnapshot[]>;
}
