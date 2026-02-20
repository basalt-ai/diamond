import type { UUID } from "@/shared/types";

export interface ReleaseGatePolicyData {
  id: UUID;
  suiteId: UUID;
  gateName: string;
  metric: string;
  threshold: number;
  comparison: "gte" | "lte";
  scope: "overall" | "per_scenario" | "per_slice";
  sliceFilter: { sliceNames?: string[]; scenarioTypeIds?: string[] } | null;
  blocking: boolean;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
