import type { LeakageReport } from "../value-objects/DiagnosticsReport";

export interface LeakageCandidate {
  candidateId: string;
  episodeId: string;
  versionIds: string[];
}

const MAX_LEAKED_ENTRIES = 1000;

export class LeakageChecker {
  compute(overlaps: LeakageCandidate[]): LeakageReport {
    // Candidates appearing in multiple versions
    const leaked = overlaps.filter((c) => c.versionIds.length > 1);
    const totalCandidates = overlaps.length;
    const leakageRate =
      totalCandidates > 0 ? leaked.length / totalCandidates : 0;

    return {
      leakage_rate: leakageRate,
      total_leaked: leaked.length,
      leaked_count_capped: leaked.length > MAX_LEAKED_ENTRIES,
    };
  }
}
