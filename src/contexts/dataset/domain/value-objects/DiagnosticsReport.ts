export interface RedundancyReport {
  method: "episode_grouping";
  duplicate_groups: Array<{
    episode_id: string;
    candidate_ids: string[];
  }>;
  redundancy_index: number;
}

export interface AgreementReport {
  method: "cohens_kappa" | "fleiss_kappa";
  overall_kappa: number;
  per_scenario_kappa: Record<string, number>;
  per_failure_mode_kappa: Record<string, number>;
  per_risk_tier_kappa: Record<string, number>;
  per_slice_kappa: Record<string, number>;
  low_agreement_slices: Array<{
    slice_name: string;
    kappa: number;
    sample_size: number;
  }>;
  sample_size: number;
}

export interface EntropyReport {
  overall_entropy: number;
  per_scenario_entropy: Record<string, number>;
  per_slice_entropy: Record<string, number>;
  high_entropy_count: number;
}

export interface ShortcutReport {
  shortcuts: Array<{
    feature: string;
    nmi: number;
    risk_level: "low" | "medium" | "high";
    significant: boolean;
  }>;
}

export interface LeakageReport {
  leakage_rate: number;
  total_leaked: number;
  leaked_count_capped: boolean;
}

export interface CoverageReport {
  overall_coverage: number;
  per_risk_tier_coverage: Record<string, number>;
  uncovered_scenarios: string[];
  min_examples_violations: Array<{
    scenario_type_id: string;
    count: number;
    required: number;
  }>;
}

export interface DiagnosticsMetrics {
  redundancy: RedundancyReport;
  agreement: AgreementReport;
  entropy?: EntropyReport;
  shortcuts?: ShortcutReport;
  leakage?: LeakageReport;
  coverage?: CoverageReport;
  computed_at: string;
}

export interface DiagnosticsReportData {
  metrics: DiagnosticsMetrics;
  gate_results: import("./GateResult").GateResult[] | null;
  summary: {
    redundancy_index: number;
    overall_kappa: number;
    candidate_count: number;
    overall_entropy?: number;
    leakage_rate?: number;
    coverage?: number;
  };
}
