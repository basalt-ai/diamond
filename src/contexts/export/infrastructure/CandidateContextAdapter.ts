import type { UUID } from "@/shared/types";

import type {
  CandidateDataReader,
  CandidateExportView,
} from "../application/ports/CandidateDataReader";

export class CandidateContextAdapter implements CandidateDataReader {
  async getMany(candidateIds: UUID[]): Promise<CandidateExportView[]> {
    const { manageCandidates } = await import("@/contexts/candidate");
    const results: CandidateExportView[] = [];

    for (const id of candidateIds) {
      try {
        const candidate = await manageCandidates.get(id);
        results.push({
          id: candidate.id,
          episodeId: candidate.episodeId,
          scenarioTypeId: candidate.scenarioTypeId,
        });
      } catch {
        // Skip not-found candidates gracefully
      }
    }

    return results;
  }
}
