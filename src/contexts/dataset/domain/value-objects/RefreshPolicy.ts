export type VersionBumpRule = "auto" | "minor" | "patch";

export interface RefreshPolicyData {
  enabled: boolean;
  minCandidateCount: number;
  minCoveragePercent: number;
  versionBumpRule: VersionBumpRule;
  cooldownMinutes: number;
  exportFormats: string[];
}

export const DEFAULT_REFRESH_POLICY: RefreshPolicyData = {
  enabled: false,
  minCandidateCount: 10,
  minCoveragePercent: 0,
  versionBumpRule: "auto",
  cooldownMinutes: 60,
  exportFormats: [],
};
