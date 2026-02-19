export interface VersionDiffData {
  version_a: { id: string; version: string; suite_id: string };
  version_b: { id: string; version: string; suite_id: string };
  added_count: number;
  removed_count: number;
  unchanged_count: number;
  added_candidate_ids: string[];
  removed_candidate_ids: string[];
}
