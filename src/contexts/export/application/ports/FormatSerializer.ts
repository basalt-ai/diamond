import type { ExportFormat } from "../../domain/value-objects/ExportFormat";

export interface ExportMetadata {
  version: string;
  suite_id: string;
  scenario_graph_version: string;
  candidate_count: number;
  lineage_hash: string;
  exported_at: string;
  format: ExportFormat;
  gate_results_summary: {
    all_passed: boolean;
    gates: number;
  };
}

export interface ExportRow {
  candidate_id: string;
  episode_id: string;
  scenario_type_id: string | null;
  labels: {
    label_task_id: string;
    annotator_id: string;
    value: Record<string, unknown>;
  }[];
}

export interface FormatSerializer {
  format: ExportFormat;
  fileExtension: string;
  serialize(metadata: ExportMetadata, rows: ExportRow[]): Buffer;
}
