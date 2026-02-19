import type { UUID } from "@/shared/types";

export interface DatasetVersionExportView {
  id: UUID;
  suiteId: UUID;
  version: string;
  state: string;
  scenarioGraphVersion: string;
  candidateIds: string[];
  lineage: Record<string, unknown> | null;
  gateResults: Record<string, unknown>[] | null;
  releasedAt: Date | null;
}

export interface DatasetVersionReader {
  getById(id: UUID): Promise<DatasetVersionExportView | null>;
}
