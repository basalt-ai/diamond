import type { CoverageReport } from "../value-objects/DiagnosticsReport";

export class CoverageAnalyzer {
  compute(
    candidateScenarios: Map<string, string | null>,
    allScenarioTypeIds: string[]
  ): CoverageReport {
    if (allScenarioTypeIds.length === 0) {
      return {
        overall_coverage: 1,
        per_risk_tier_coverage: {},
        uncovered_scenarios: [],
        min_examples_violations: [],
      };
    }

    // Collect covered scenario types
    const coveredScenarios = new Set<string>();
    for (const [, scenarioTypeId] of candidateScenarios) {
      if (scenarioTypeId) {
        coveredScenarios.add(scenarioTypeId);
      }
    }

    const allSet = new Set(allScenarioTypeIds);
    const uncovered: string[] = [];
    for (const id of allSet) {
      if (!coveredScenarios.has(id)) {
        uncovered.push(id);
      }
    }

    const overallCoverage = coveredScenarios.size / allSet.size;

    return {
      overall_coverage: overallCoverage,
      per_risk_tier_coverage: {},
      uncovered_scenarios: uncovered,
      min_examples_violations: [],
    };
  }
}
