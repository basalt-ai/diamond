import type { UUID } from "@/shared/types";

import type {
  CandidateInfo,
  CandidateReader,
} from "../application/ports/CandidateReader";

export class CandidateContextAdapter implements CandidateReader {
  private async getCandidateModule() {
    return await import("@/contexts/candidate");
  }

  async getMany(candidateIds: UUID[]): Promise<CandidateInfo[]> {
    if (candidateIds.length === 0) return [];
    const { manageCandidates } = await this.getCandidateModule();
    const candidates = await manageCandidates.getMany(candidateIds);
    return candidates.map((c) => ({
      id: c.id,
      episodeId: c.episodeId,
      scenarioTypeId: c.scenarioTypeId,
      state: c.state,
    }));
  }

  async isInState(candidateId: UUID, states: string[]): Promise<boolean> {
    try {
      const { manageCandidates } = await this.getCandidateModule();
      const candidate = await manageCandidates.get(candidateId);
      return states.includes(candidate.state);
    } catch {
      return false;
    }
  }

  async findEligibleForDataset(
    scenarioTypeIds: UUID[] | "all"
  ): Promise<CandidateInfo[]> {
    const { manageCandidates } = await this.getCandidateModule();
    const eligible: CandidateInfo[] = [];

    for (const state of ["validated", "released"] as const) {
      if (scenarioTypeIds === "all") {
        const result = await manageCandidates.list({ state }, 1, 10000);
        eligible.push(
          ...result.data.map((c) => ({
            id: c.id,
            episodeId: c.episodeId,
            scenarioTypeId: c.scenarioTypeId,
            state: c.state,
          }))
        );
      } else {
        for (const scenarioTypeId of scenarioTypeIds) {
          const result = await manageCandidates.list(
            { state, scenarioTypeId },
            1,
            10000
          );
          eligible.push(
            ...result.data.map((c) => ({
              id: c.id,
              episodeId: c.episodeId,
              scenarioTypeId: c.scenarioTypeId,
              state: c.state,
            }))
          );
        }
      }
    }

    // Deduplicate by ID
    const seen = new Set<string>();
    return eligible.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }
}
