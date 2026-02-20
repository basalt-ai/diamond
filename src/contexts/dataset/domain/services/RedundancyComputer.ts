import type { CandidateInfo } from "../../application/ports/CandidateReader";
import type { RedundancyReport } from "../value-objects/DiagnosticsReport";

export class RedundancyComputer {
  compute(candidates: CandidateInfo[]): RedundancyReport {
    // Group candidates by episodeId
    const groups = new Map<string, string[]>();

    for (const candidate of candidates) {
      const existing = groups.get(candidate.episodeId);
      if (existing) {
        existing.push(candidate.id);
      } else {
        groups.set(candidate.episodeId, [candidate.id]);
      }
    }

    // Find groups with more than one candidate (duplicates)
    const duplicateGroups: Array<{
      episode_id: string;
      candidate_ids: string[];
    }> = [];

    let candidatesInDuplicateGroups = 0;

    for (const [episodeId, candidateIds] of groups) {
      if (candidateIds.length > 1) {
        duplicateGroups.push({
          episode_id: episodeId,
          candidate_ids: candidateIds,
        });
        candidatesInDuplicateGroups += candidateIds.length;
      }
    }

    const redundancyIndex =
      candidates.length > 0
        ? candidatesInDuplicateGroups / candidates.length
        : 0;

    return {
      method: "episode_grouping",
      duplicate_groups: duplicateGroups,
      redundancy_index: redundancyIndex,
    };
  }
}
