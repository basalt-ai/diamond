import type { UUID } from "@/shared/types";

import type { DatasetReader } from "../../application/ports/DatasetReader";
import type { ScenarioReader } from "../../application/ports/ScenarioReader";
import type {
  DimensionScorer,
  ScoringContext,
} from "../../application/ports/ScoringEngine";

export class CoverageGainScorer implements DimensionScorer {
  readonly dimension = "coverageGain" as const;

  constructor(
    private readonly scenarioReader: ScenarioReader,
    private readonly datasetReader: DatasetReader
  ) {}

  async score(ctx: ScoringContext): Promise<number> {
    if (!ctx.scenarioTypeId) return 0.5; // unmapped gets neutral score

    const allTypes = await this.scenarioReader.findAllTypes();
    const datasetSnapshots =
      await this.datasetReader.findCandidateSnapshotsInCurrentDataset();

    const totalScenarios = allTypes.length;
    if (totalScenarios === 0) return 0;

    const coveredCount = new Map<string, number>();
    for (const snap of datasetSnapshots) {
      if (snap.scenarioTypeId) {
        coveredCount.set(
          snap.scenarioTypeId,
          (coveredCount.get(snap.scenarioTypeId) ?? 0) + 1
        );
      }
    }

    const currentCount = coveredCount.get(ctx.scenarioTypeId) ?? 0;
    // Inverse of coverage: less covered scenarios have higher gain
    return 1 / (1 + currentCount);
  }

  async scoreBatch(contexts: ScoringContext[]): Promise<Map<UUID, number>> {
    const allTypes = await this.scenarioReader.findAllTypes();
    const datasetSnapshots =
      await this.datasetReader.findCandidateSnapshotsInCurrentDataset();

    const totalScenarios = allTypes.length;
    const coveredCount = new Map<string, number>();
    for (const snap of datasetSnapshots) {
      if (snap.scenarioTypeId) {
        coveredCount.set(
          snap.scenarioTypeId,
          (coveredCount.get(snap.scenarioTypeId) ?? 0) + 1
        );
      }
    }

    const results = new Map<UUID, number>();
    for (const ctx of contexts) {
      if (!ctx.scenarioTypeId || totalScenarios === 0) {
        results.set(ctx.candidateId, 0.5);
        continue;
      }
      const count = coveredCount.get(ctx.scenarioTypeId) ?? 0;
      results.set(ctx.candidateId, 1 / (1 + count));
    }
    return results;
  }
}
