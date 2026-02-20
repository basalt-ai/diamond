export interface VersionDiffData {
  version_a: { id: string; version: string; suite_id: string };
  version_b: { id: string; version: string; suite_id: string };
  added_count: number;
  removed_count: number;
  unchanged_count: number;
  changed_count: number;
  net_delta: number;
  added_candidate_ids: string[];
  removed_candidate_ids: string[];
  changed: Array<{
    candidateId: string;
    previousLabelHash: string;
    currentLabelHash: string;
  }>;
  scenario_breakdown: {
    added: Record<string, number>;
    removed: Record<string, number>;
    changed: Record<string, number>;
  };
}
