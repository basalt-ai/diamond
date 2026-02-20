import type { UUID } from "@/shared/types";

export interface ClusterSummary {
  suggestedName: string;
  suggestedDescription: string;
  suggestedRiskCategory: "business" | "safety" | "compliance";
}

export interface ClusterSummarizer {
  summarize(representativeCandidateIds: UUID[]): Promise<ClusterSummary>;
}
