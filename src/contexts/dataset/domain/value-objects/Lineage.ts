export interface LineageCandidate {
  candidate_id: string;
  episode_id: string;
  label_task_ids: string[];
  rubric_version?: number;
  scenario_type_id?: string;
}

export interface LineageData {
  scenario_graph_version: string;
  selection_policy: Record<string, unknown>;
  candidate_count: number;
  candidates: LineageCandidate[];
  captured_at: string;
}
