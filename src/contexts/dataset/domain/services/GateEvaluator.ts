import type { ReleaseGatePolicyData } from "../entities/ReleaseGatePolicy";
import type { DiagnosticsMetrics } from "../value-objects/DiagnosticsReport";
import type { GateResult } from "../value-objects/GateResult";

const DEFAULT_GATES: Array<{
  gateName: string;
  metric: string;
  threshold: number;
  comparison: "gte" | "lte";
}> = [
  {
    gateName: "min_agreement",
    metric: "agreement",
    threshold: 0.6,
    comparison: "gte",
  },
  {
    gateName: "max_redundancy",
    metric: "redundancy",
    threshold: 0.1,
    comparison: "lte",
  },
];

export class GateEvaluator {
  evaluate(
    metrics: DiagnosticsMetrics,
    policies: ReleaseGatePolicyData[]
  ): GateResult[] {
    const enabledPolicies = policies.filter((p) => p.enabled);

    if (enabledPolicies.length === 0) {
      return this.evaluateDefaults(metrics);
    }

    const results: GateResult[] = [];

    for (const policy of enabledPolicies) {
      switch (policy.scope) {
        case "overall": {
          const actual = this.getMetricValue(metrics, policy.metric);
          if (actual !== null) {
            results.push({
              gate: policy.gateName,
              threshold: policy.threshold,
              actual,
              passed: this.evaluateComparison(
                actual,
                policy.threshold,
                policy.comparison
              ),
              blocking: policy.blocking,
              scope: "overall",
              scopeTarget: null,
            });
          }
          break;
        }
        case "per_scenario": {
          const scopeTargets = this.getScopeTargets(
            metrics,
            policy.metric,
            "per_scenario"
          );
          for (const [target, value] of scopeTargets) {
            results.push({
              gate: policy.gateName,
              threshold: policy.threshold,
              actual: value,
              passed: this.evaluateComparison(
                value,
                policy.threshold,
                policy.comparison
              ),
              blocking: policy.blocking,
              scope: "per_scenario",
              scopeTarget: target,
            });
          }
          break;
        }
        case "per_slice": {
          const scopeTargets = this.getScopeTargets(
            metrics,
            policy.metric,
            "per_slice"
          );
          for (const [target, value] of scopeTargets) {
            results.push({
              gate: policy.gateName,
              threshold: policy.threshold,
              actual: value,
              passed: this.evaluateComparison(
                value,
                policy.threshold,
                policy.comparison
              ),
              blocking: policy.blocking,
              scope: "per_slice",
              scopeTarget: target,
            });
          }
          break;
        }
      }
    }

    return results;
  }

  private evaluateDefaults(metrics: DiagnosticsMetrics): GateResult[] {
    const results: GateResult[] = [];

    for (const gate of DEFAULT_GATES) {
      const actual = this.getMetricValue(metrics, gate.metric);
      if (actual !== null) {
        results.push({
          gate: gate.gateName,
          threshold: gate.threshold,
          actual,
          passed: this.evaluateComparison(
            actual,
            gate.threshold,
            gate.comparison
          ),
          blocking: true,
          scope: "overall",
          scopeTarget: null,
        });
      }
    }

    return results;
  }

  private getMetricValue(
    metrics: DiagnosticsMetrics,
    metric: string,
    scopeTarget?: string
  ): number | null {
    switch (metric) {
      case "agreement":
        if (scopeTarget) {
          return metrics.agreement.per_scenario_kappa[scopeTarget] ?? null;
        }
        return metrics.agreement.overall_kappa;
      case "redundancy":
        return metrics.redundancy.redundancy_index;
      case "coverage":
        return metrics.coverage?.overall_coverage ?? null;
      case "entropy":
        if (scopeTarget) {
          return metrics.entropy?.per_scenario_entropy[scopeTarget] ?? null;
        }
        return metrics.entropy?.overall_entropy ?? null;
      case "leakage":
        return metrics.leakage?.leakage_rate ?? null;
      default:
        return null;
    }
  }

  private getScopeTargets(
    metrics: DiagnosticsMetrics,
    metric: string,
    scope: "per_scenario" | "per_slice"
  ): Array<[string, number]> {
    switch (metric) {
      case "agreement": {
        const record =
          scope === "per_scenario"
            ? metrics.agreement.per_scenario_kappa
            : metrics.agreement.per_slice_kappa;
        return Object.entries(record);
      }
      case "entropy": {
        if (!metrics.entropy) return [];
        const record =
          scope === "per_scenario"
            ? metrics.entropy.per_scenario_entropy
            : metrics.entropy.per_slice_entropy;
        return Object.entries(record);
      }
      case "coverage": {
        if (!metrics.coverage || scope !== "per_scenario") return [];
        return Object.entries(metrics.coverage.per_risk_tier_coverage);
      }
      default:
        return [];
    }
  }

  private evaluateComparison(
    actual: number,
    threshold: number,
    comparison: "gte" | "lte"
  ): boolean {
    return comparison === "gte" ? actual >= threshold : actual <= threshold;
  }
}
