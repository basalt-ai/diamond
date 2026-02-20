export type ScenarioTypeScope = "all" | "explicit";
export type VersionBumpRule = "auto" | "minor" | "patch";

export interface RefreshPolicyData {
  enabled: boolean;
  scenarioTypeScope: ScenarioTypeScope;
  scenarioTypeIds: string[];
  minCandidateCount: number;
  minCoveragePercent: number;
  versionBumpRule: VersionBumpRule;
  cooldownMinutes: number;
  exportFormats: string[];
}

export const DEFAULT_REFRESH_POLICY: RefreshPolicyData = {
  enabled: false,
  scenarioTypeScope: "all",
  scenarioTypeIds: [],
  minCandidateCount: 10,
  minCoveragePercent: 0,
  versionBumpRule: "auto",
  cooldownMinutes: 60,
  exportFormats: [],
};
