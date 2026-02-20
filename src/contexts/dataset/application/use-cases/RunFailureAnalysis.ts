import type { UUID } from "@/shared/types";

import { InsufficientEvalRunsError } from "../../domain/errors";
import type { DatasetVersionRepository } from "../ports/DatasetVersionRepository";
import type {
  EvalResultRow,
  EvalRunRepository,
  EvalRunWithStats,
} from "../ports/EvalRunRepository";

export interface ScenarioClassification {
  scenario_type_id: string;
  classification:
    | "persistently_failing"
    | "newly_failing"
    | "newly_fixed"
    | "regressing"
    | "stable_passing";
  pass_rates: Array<{
    model_version: string;
    pass_rate: number;
    total: number;
  }>;
  trend: {
    slope: number;
    direction: "improving" | "degrading" | "stable" | "fluctuating";
  };
}

export interface FailureAnalysisReport {
  dataset_version_id: string;
  eval_run_count: number;
  model_versions: string[];
  scenario_classifications: ScenarioClassification[];
  summary: {
    persistently_failing: number;
    newly_failing: number;
    newly_fixed: number;
    regressing: number;
    stable_passing: number;
  };
}

export class RunFailureAnalysis {
  constructor(
    private readonly evalRunRepo: EvalRunRepository,
    private readonly versionRepo: DatasetVersionRepository
  ) {}

  async execute(versionId: UUID): Promise<FailureAnalysisReport> {
    const { data: runs } = await this.evalRunRepo.list(
      { datasetVersionId: versionId },
      1,
      100
    );

    const uniqueModels = new Set(runs.map((r) => r.modelVersion));
    if (uniqueModels.size < 2) {
      throw new InsufficientEvalRunsError(versionId, uniqueModels.size);
    }

    const sortedRuns = [...runs].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    const allResults = await this.evalRunRepo.getResultsByVersionId(versionId);
    const resultsByRun = this.groupByRunId(allResults);
    const scenarioIds = await this.getScenarioIds(versionId);

    const classifications: ScenarioClassification[] = [];

    for (const scenarioId of scenarioIds) {
      const passRates = this.computePassRatesForScenario(
        scenarioId,
        sortedRuns,
        resultsByRun
      );

      if (passRates.length === 0) continue;

      const classification = this.classifyScenario(passRates);
      const trend = this.detectTrend(passRates.map((p) => p.passRate));

      classifications.push({
        scenario_type_id: scenarioId,
        classification,
        pass_rates: passRates.map((p) => ({
          model_version: p.modelVersion,
          pass_rate: p.passRate,
          total: p.total,
        })),
        trend,
      });
    }

    const summary = {
      persistently_failing: classifications.filter(
        (c) => c.classification === "persistently_failing"
      ).length,
      newly_failing: classifications.filter(
        (c) => c.classification === "newly_failing"
      ).length,
      newly_fixed: classifications.filter(
        (c) => c.classification === "newly_fixed"
      ).length,
      regressing: classifications.filter(
        (c) => c.classification === "regressing"
      ).length,
      stable_passing: classifications.filter(
        (c) => c.classification === "stable_passing"
      ).length,
    };

    return {
      dataset_version_id: versionId,
      eval_run_count: runs.length,
      model_versions: [...uniqueModels],
      scenario_classifications: classifications,
      summary,
    };
  }

  private groupByRunId(results: EvalResultRow[]): Map<string, EvalResultRow[]> {
    const map = new Map<string, EvalResultRow[]>();
    for (const r of results) {
      const list = map.get(r.evalRunId) ?? [];
      list.push(r);
      map.set(r.evalRunId, list);
    }
    return map;
  }

  private async getScenarioIds(versionId: UUID): Promise<string[]> {
    // For now, derive scenario IDs from eval results' failure modes
    // In a full implementation, this would cross-reference with candidate data
    const { data: runs } = await this.evalRunRepo.list(
      { datasetVersionId: versionId },
      1,
      1
    );
    if (runs.length === 0) return [];

    const results = await this.evalRunRepo.getResultsByVersionId(versionId);
    const scenarioIds = new Set<string>();
    for (const r of results) {
      if (r.failureMode) scenarioIds.add(r.failureMode);
    }
    return [...scenarioIds];
  }

  private computePassRatesForScenario(
    scenarioId: string,
    sortedRuns: EvalRunWithStats[],
    resultsByRun: Map<string, EvalResultRow[]>
  ): Array<{ modelVersion: string; passRate: number; total: number }> {
    const rates: Array<{
      modelVersion: string;
      passRate: number;
      total: number;
    }> = [];

    for (const run of sortedRuns) {
      const results = resultsByRun.get(run.id) ?? [];
      const scenarioResults = results.filter(
        (r) => r.failureMode === scenarioId
      );
      if (scenarioResults.length === 0) continue;

      const passed = scenarioResults.filter((r) => r.passed).length;
      rates.push({
        modelVersion: run.modelVersion,
        passRate: passed / scenarioResults.length,
        total: scenarioResults.length,
      });
    }

    return rates;
  }

  private classifyScenario(
    passRates: Array<{ passRate: number }>
  ): ScenarioClassification["classification"] {
    if (passRates.length < 2) return "stable_passing";

    const allFailing = passRates.every((p) => p.passRate < 0.5);
    if (allFailing) return "persistently_failing";

    const prev = passRates[passRates.length - 2]!;
    const curr = passRates[passRates.length - 1]!;

    if (prev.passRate > 0.8 && curr.passRate < 0.5) return "newly_failing";
    if (prev.passRate < 0.5 && curr.passRate > 0.8) return "newly_fixed";

    if (passRates.length >= 3) {
      let declining = true;
      for (let i = 1; i < passRates.length; i++) {
        if (passRates[i]!.passRate >= passRates[i - 1]!.passRate) {
          declining = false;
          break;
        }
      }
      if (declining) return "regressing";
    }

    return "stable_passing";
  }

  private detectTrend(values: number[]): ScenarioClassification["trend"] {
    if (values.length < 2) {
      return { slope: 0, direction: "stable" };
    }

    // Simple linear regression: y = mx + b
    const n = values.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i]!;
      sumXY += i * values[i]!;
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // R² for variance check
    const meanY = sumY / n;
    let ssTot = 0;
    let ssRes = 0;
    for (let i = 0; i < n; i++) {
      const predicted = slope * i + (meanY - slope * (sumX / n));
      ssTot += (values[i]! - meanY) ** 2;
      ssRes += (values[i]! - predicted) ** 2;
    }
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 1;

    let direction: ScenarioClassification["trend"]["direction"];
    if (r2 < 0.5 && Math.abs(slope) > 0.05) {
      direction = "fluctuating";
    } else if (slope < -0.1) {
      direction = "degrading";
    } else if (slope > 0.1) {
      direction = "improving";
    } else {
      direction = "stable";
    }

    return { slope, direction };
  }
}
