import { NotFoundError } from "@/lib/domain/DomainError";
import type { UUID } from "@/shared/types";

import { jensenShannonDivergence } from "../../domain/services/StatisticalUtils";
import type { DatasetVersionRepository } from "../ports/DatasetVersionRepository";
import type { ProductionDistributionReader } from "../ports/ProductionDistributionReader";

export interface PerScenarioDrift {
  scenario_type_id: string;
  production_pct: number;
  dataset_pct: number;
  direction: "overrepresented" | "underrepresented" | "balanced";
  staleness_score: number;
}

export interface StaleScenario {
  scenario_type_id: string;
  staleness_score: number;
  recommendation: string;
}

export interface DriftReport {
  jsd: number;
  interpretation: "negligible" | "moderate" | "significant" | "severe";
  per_scenario_drift: PerScenarioDrift[];
  stale_scenarios: StaleScenario[];
  time_window_days: number;
  production_count: number;
  dataset_count: number;
}

function interpretJSD(jsd: number): DriftReport["interpretation"] {
  if (jsd < 0.05) return "negligible";
  if (jsd < 0.15) return "moderate";
  if (jsd < 0.3) return "significant";
  return "severe";
}

export class ComputeDrift {
  constructor(
    private readonly versionRepo: DatasetVersionRepository,
    private readonly distributionReader: ProductionDistributionReader
  ) {}

  async execute(versionId: UUID, days: number = 30): Promise<DriftReport> {
    const version = await this.versionRepo.findById(versionId);
    if (!version) {
      throw new NotFoundError("DatasetVersion", versionId);
    }

    const candidateIds = version.candidateIds as string[];

    // Build dataset scenario distribution from lineage if available
    const datasetScenarioCounts = new Map<string, number>();
    if (version.lineage && typeof version.lineage === "object") {
      const lineage = version.lineage as {
        candidates?: Array<{ scenario_type_id?: string }>;
      };
      if (lineage.candidates) {
        for (const c of lineage.candidates) {
          if (c.scenario_type_id) {
            datasetScenarioCounts.set(
              c.scenario_type_id,
              (datasetScenarioCounts.get(c.scenario_type_id) ?? 0) + 1
            );
          }
        }
      }
    }

    const datasetTotal = candidateIds.length;

    // Get production distribution
    const productionDist =
      await this.distributionReader.getScenarioDistribution(days);
    const productionCount =
      await this.distributionReader.getTotalCandidateCount(days);

    // Collect all scenario IDs
    const allScenarioIds = new Set<string>();
    for (const id of datasetScenarioCounts.keys()) allScenarioIds.add(id);
    for (const id of productionDist.keys()) allScenarioIds.add(id);

    // Build probability distributions
    const pProduction: number[] = [];
    const pDataset: number[] = [];
    const scenarioIds: string[] = [];

    for (const scenarioId of allScenarioIds) {
      scenarioIds.push(scenarioId);
      const prodCount = productionDist.get(scenarioId as UUID) ?? 0;
      const dsCount = datasetScenarioCounts.get(scenarioId) ?? 0;
      pProduction.push(productionCount > 0 ? prodCount / productionCount : 0);
      pDataset.push(datasetTotal > 0 ? dsCount / datasetTotal : 0);
    }

    const jsd = jensenShannonDivergence(pProduction, pDataset);
    const interpretation = interpretJSD(jsd);

    // Per-scenario drift analysis
    const perScenarioDrift: PerScenarioDrift[] = [];
    for (let i = 0; i < scenarioIds.length; i++) {
      const prodPct = pProduction[i] ?? 0;
      const dsPct = pDataset[i] ?? 0;
      const diff = dsPct - prodPct;
      const staleness = Math.abs(diff);

      let direction: PerScenarioDrift["direction"];
      if (diff > 0.02) direction = "overrepresented";
      else if (diff < -0.02) direction = "underrepresented";
      else direction = "balanced";

      perScenarioDrift.push({
        scenario_type_id: scenarioIds[i]!,
        production_pct: prodPct,
        dataset_pct: dsPct,
        direction,
        staleness_score: staleness,
      });
    }

    // Stale scenarios: underrepresented with high staleness
    const staleScenarios: StaleScenario[] = perScenarioDrift
      .filter(
        (d) => d.direction === "underrepresented" && d.staleness_score > 0.05
      )
      .map((d) => ({
        scenario_type_id: d.scenario_type_id,
        staleness_score: d.staleness_score,
        recommendation: `Scenario is underrepresented in dataset by ${(d.staleness_score * 100).toFixed(1)}%. Consider adding more examples.`,
      }));

    return {
      jsd,
      interpretation,
      per_scenario_drift: perScenarioDrift,
      stale_scenarios: staleScenarios,
      time_window_days: days,
      production_count: productionCount,
      dataset_count: datasetTotal,
    };
  }
}
