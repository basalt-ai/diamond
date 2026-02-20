import type { EntropyReport } from "../value-objects/DiagnosticsReport";
import { shannonEntropy } from "./StatisticalUtils";

const HIGH_ENTROPY_THRESHOLD = 0.8;
const MAX_HIGH_ENTROPY_CANDIDATES = 200;

export class EntropyComputer {
  compute(
    labelsMap: Map<
      string,
      Array<{ labelValue: unknown; scenarioTypeId?: string | null }>
    >
  ): EntropyReport {
    let totalEntropy = 0;
    let candidateCount = 0;
    let highEntropyCount = 0;

    // Per-scenario accumulators
    const scenarioEntropies = new Map<string, { sum: number; count: number }>();

    for (const [, labels] of labelsMap) {
      if (labels.length < 2) continue;

      // Count label value frequencies
      const freq = new Map<string, number>();
      let scenarioTypeId: string | null = null;

      for (const label of labels) {
        const key = JSON.stringify(label.labelValue);
        freq.set(key, (freq.get(key) ?? 0) + 1);
        if (label.scenarioTypeId) {
          scenarioTypeId = label.scenarioTypeId;
        }
      }

      const counts = [...freq.values()];
      const h = shannonEntropy(counts);

      totalEntropy += h;
      candidateCount++;

      if (h > HIGH_ENTROPY_THRESHOLD) {
        highEntropyCount++;
      }

      // Accumulate per-scenario
      if (scenarioTypeId) {
        const existing = scenarioEntropies.get(scenarioTypeId);
        if (existing) {
          existing.sum += h;
          existing.count++;
        } else {
          scenarioEntropies.set(scenarioTypeId, { sum: h, count: 1 });
        }
      }
    }

    const overallEntropy =
      candidateCount > 0 ? totalEntropy / candidateCount : 0;

    const perScenarioEntropy: Record<string, number> = {};
    for (const [scenarioId, { sum, count }] of scenarioEntropies) {
      perScenarioEntropy[scenarioId] = sum / count;
    }

    return {
      overall_entropy: overallEntropy,
      per_scenario_entropy: perScenarioEntropy,
      per_slice_entropy: {},
      high_entropy_count: Math.min(
        highEntropyCount,
        MAX_HIGH_ENTROPY_CANDIDATES
      ),
    };
  }
}
