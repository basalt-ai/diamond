export interface RedundancyReport {
  method: "jaccard_similarity";
  threshold: number;
  duplicate_pairs: Array<{
    candidate_a: string;
    candidate_b: string;
    similarity: number;
  }>;
  redundancy_index: number;
}

export interface AgreementReport {
  method: "cohens_kappa";
  overall_kappa: number;
  per_scenario_kappa: Record<string, number>;
  sample_size: number;
}

export interface DiagnosticsReportData {
  redundancy: RedundancyReport;
  agreement: AgreementReport;
  computed_at: string;
}
