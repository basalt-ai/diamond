import type { LabelSummary } from "../../application/ports/LabelReader";
import type { AgreementReport } from "../value-objects/DiagnosticsReport";
import { cohensKappa, fleissKappa } from "./StatisticalUtils";

export class AgreementComputer {
  compute(labelsMap: Map<string, LabelSummary[]>): AgreementReport {
    const perCandidateKappas: number[] = [];
    let maxRaters = 0;

    // Collect all per-candidate kappa values
    for (const [, labels] of labelsMap) {
      if (labels.length < 2) continue;

      const raterCount = labels.length;
      if (raterCount > maxRaters) maxRaters = raterCount;

      if (raterCount === 2) {
        // Cohen's kappa: build pairs
        const a = JSON.stringify(labels[0]!.labelValue);
        const b = JSON.stringify(labels[1]!.labelValue);
        const kappa = cohensKappa([[a, b]]);
        perCandidateKappas.push(kappa);
      } else {
        // Fleiss' kappa for this single item
        const categoryCounts: Record<string, number> = {};
        for (const label of labels) {
          const key = JSON.stringify(label.labelValue);
          categoryCounts[key] = (categoryCounts[key] ?? 0) + 1;
        }
        const kappa = fleissKappa([categoryCounts]);
        perCandidateKappas.push(kappa);
      }
    }

    // Compute overall kappa across all candidates using pooled approach
    const overallKappa = this.computeOverallKappa(labelsMap, maxRaters);
    const method = maxRaters > 2 ? "fleiss_kappa" : "cohens_kappa";

    return {
      method,
      overall_kappa: overallKappa,
      per_scenario_kappa: {},
      per_failure_mode_kappa: {},
      per_risk_tier_kappa: {},
      per_slice_kappa: {},
      low_agreement_slices: [],
      sample_size: perCandidateKappas.length,
    };
  }

  private computeOverallKappa(
    labelsMap: Map<string, LabelSummary[]>,
    maxRaters: number
  ): number {
    // Filter to candidates with 2+ labels
    const eligible: Array<[string, LabelSummary[]]> = [];
    for (const [id, labels] of labelsMap) {
      if (labels.length >= 2) {
        eligible.push([id, labels]);
      }
    }

    if (eligible.length === 0) return 1.0;

    if (maxRaters <= 2) {
      // Pool all pairs for Cohen's kappa
      const allPairs: [string, string][] = [];
      for (const [, labels] of eligible) {
        if (labels.length >= 2) {
          // Use all pairwise combinations
          for (let i = 0; i < labels.length; i++) {
            for (let j = i + 1; j < labels.length; j++) {
              allPairs.push([
                JSON.stringify(labels[i]!.labelValue),
                JSON.stringify(labels[j]!.labelValue),
              ]);
            }
          }
        }
      }
      return cohensKappa(allPairs);
    }

    // Fleiss' kappa across all items
    const items: Array<Record<string, number>> = [];
    for (const [, labels] of eligible) {
      const categoryCounts: Record<string, number> = {};
      for (const label of labels) {
        const key = JSON.stringify(label.labelValue);
        categoryCounts[key] = (categoryCounts[key] ?? 0) + 1;
      }
      items.push(categoryCounts);
    }
    return fleissKappa(items);
  }
}
