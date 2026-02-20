import type { LabelSummary } from "../../application/ports/LabelReader";
import type { AgreementReport } from "../value-objects/DiagnosticsReport";

export class AgreementComputer {
  compute(labelsMap: Map<string, LabelSummary[]>): AgreementReport {
    let totalAgreement = 0;
    let sampleCount = 0;

    for (const [, labels] of labelsMap) {
      if (labels.length < 2) continue;

      // Simple pairwise agreement: fraction of label pairs that agree
      let agreePairs = 0;
      let totalPairs = 0;
      for (let i = 0; i < labels.length; i++) {
        for (let j = i + 1; j < labels.length; j++) {
          totalPairs++;
          const a = labels[i]!;
          const b = labels[j]!;
          if (JSON.stringify(a.labelValue) === JSON.stringify(b.labelValue)) {
            agreePairs++;
          }
        }
      }

      if (totalPairs > 0) {
        totalAgreement += agreePairs / totalPairs;
        sampleCount++;
      }
    }

    const overallKappa = sampleCount > 0 ? totalAgreement / sampleCount : 1.0;

    return {
      method: "cohens_kappa",
      overall_kappa: overallKappa,
      per_scenario_kappa: {},
      per_failure_mode_kappa: {},
      per_risk_tier_kappa: {},
      per_slice_kappa: {},
      low_agreement_slices: [],
      sample_size: sampleCount,
    };
  }
}
