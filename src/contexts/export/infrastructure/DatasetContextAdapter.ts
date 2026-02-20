import { manageDatasetVersions } from "@/contexts/dataset";
import type { UUID } from "@/shared/types";

import type {
  DatasetVersionExportView,
  DatasetVersionReader,
} from "../application/ports/DatasetVersionReader";

export class DatasetContextAdapter implements DatasetVersionReader {
  async getById(id: UUID): Promise<DatasetVersionExportView | null> {
    try {
      const version = await manageDatasetVersions.get(id);
      return {
        id: version.id,
        suiteId: version.suiteId,
        version: version.version,
        state: version.state,
        scenarioGraphVersion: version.scenarioGraphVersion,
        candidateIds: version.candidateIds,
        lineage: version.lineage as Record<string, unknown> | null,
        gateResults: version.gateResults as Record<string, unknown>[] | null,
        releasedAt: version.releasedAt,
      };
    } catch {
      return null;
    }
  }
}
