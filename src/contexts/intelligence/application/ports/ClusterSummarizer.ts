import type { UUID } from "@/shared/types";

export interface ClusterSummary {
  suggestedName: string;
  suggestedDescription: string;
  suggestedRiskCategory: "business" | "safety" | "compliance";
  suggestedFailureModes: Array<{
    name: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
  }>;
  suggestedContextProfile: {
    name: string;
    attributes: Record<string, string>;
  } | null;
}

export interface ClusterSummarizer {
  summarize(representativeCandidateIds: UUID[]): Promise<ClusterSummary>;
}
