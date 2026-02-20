import type { ShortcutReport } from "../value-objects/DiagnosticsReport";
import { normalizedMI, gTest } from "./StatisticalUtils";

export interface CandidateFeatures {
  turnCount: number | null;
  toolCallCount: number | null;
  language: string | null;
  hasNegativeFeedback: boolean | null;
  latencyMs: number | null;
}

type RiskLevel = "low" | "medium" | "high";

/**
 * Detects potential shortcut features that correlate with labels.
 * Uses NMI for effect size and G-test with Bonferroni correction for significance.
 */
export class ShortcutDetector {
  compute(
    features: Map<string, CandidateFeatures>,
    labels: Map<string, string>
  ): ShortcutReport {
    // Only consider candidates present in both maps
    const candidateIds = [...features.keys()].filter((id) => labels.has(id));
    if (candidateIds.length === 0) return { shortcuts: [] };

    const featureNames: Array<{
      name: string;
      extract: (f: CandidateFeatures) => string | null;
    }> = [
      {
        name: "turn_count",
        extract: (f) => this.discretizeContinuous(f.turnCount, [1, 3, 7]),
      },
      {
        name: "tool_call_count",
        extract: (f) => this.discretizeContinuous(f.toolCallCount, [0, 2, 5]),
      },
      { name: "language", extract: (f) => f.language },
      {
        name: "has_negative_feedback",
        extract: (f) =>
          f.hasNegativeFeedback === null ? null : String(f.hasNegativeFeedback),
      },
      {
        name: "latency_ms",
        extract: (f) =>
          this.discretizeContinuous(f.latencyMs, [500, 2000, 5000]),
      },
    ];

    const numTests = featureNames.length;
    const results: ShortcutReport["shortcuts"] = [];

    for (const { name, extract } of featureNames) {
      const featureValues: string[] = [];
      const labelValues: string[] = [];

      for (const id of candidateIds) {
        const feat = features.get(id)!;
        const val = extract(feat);
        if (val !== null) {
          featureValues.push(val);
          labelValues.push(labels.get(id)!);
        }
      }

      if (featureValues.length < 10) {
        results.push({
          feature: name,
          nmi: 0,
          risk_level: "low",
          significant: false,
        });
        continue;
      }

      const nmi = normalizedMI(featureValues, labelValues);

      // Build contingency table for G-test
      const table = this.buildContingencyTable(featureValues, labelValues);
      const { pValue } = gTest(table);

      // Bonferroni correction
      const significant = pValue < 0.05 / numTests;

      const riskLevel: RiskLevel =
        nmi > 0.3 ? "high" : nmi > 0.1 ? "medium" : "low";

      results.push({
        feature: name,
        nmi,
        risk_level: riskLevel,
        significant,
      });
    }

    return { shortcuts: results };
  }

  private discretizeContinuous(
    value: number | null,
    thresholds: number[]
  ): string | null {
    if (value === null) return null;

    for (let i = 0; i < thresholds.length; i++) {
      if (value <= thresholds[i]!) {
        return `bin_${i}`;
      }
    }
    return `bin_${thresholds.length}`;
  }

  private buildContingencyTable(
    featureValues: string[],
    labelValues: string[]
  ): number[][] {
    const featureCats = [...new Set(featureValues)];
    const labelCats = [...new Set(labelValues)];

    const featureIndex = new Map<string, number>();
    for (let i = 0; i < featureCats.length; i++) {
      featureIndex.set(featureCats[i]!, i);
    }
    const labelIndex = new Map<string, number>();
    for (let i = 0; i < labelCats.length; i++) {
      labelIndex.set(labelCats[i]!, i);
    }

    const table: number[][] = Array.from({ length: featureCats.length }, () =>
      Array.from({ length: labelCats.length }, () => 0)
    );

    for (let i = 0; i < featureValues.length; i++) {
      const fi = featureIndex.get(featureValues[i]!)!;
      const li = labelIndex.get(labelValues[i]!)!;
      table[fi]![li]! += 1;
    }

    return table;
  }
}
