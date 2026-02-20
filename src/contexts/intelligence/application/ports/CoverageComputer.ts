import type { UUID } from "@/shared/types";

export interface CoverageByItem {
  id: UUID;
  name: string;
  count: number;
  pct: number;
}

export interface CoverageGap {
  scenarioTypeId: UUID;
  name: string;
  candidateCount: number;
  datasetCount: number;
}

export interface CoverageReport {
  totalScenarioTypes: number;
  coveredScenarioTypes: number;
  scenarioCoveragePct: number;
  byScenarioType: CoverageByItem[];
  byRiskTier: Array<{ name: string; count: number; pct: number }>;
  gaps: CoverageGap[];
}

export interface CoverageComputer {
  compute(): Promise<CoverageReport>;
}
