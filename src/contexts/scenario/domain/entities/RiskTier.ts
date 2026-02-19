import type { UUID } from "@/shared/types";

export type RiskCategory = "business" | "safety" | "compliance";

export interface RiskTierData {
  id: UUID;
  name: string;
  weight: number;
  category: RiskCategory;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateRiskTierInput = {
  name: string;
  weight: number;
  category: RiskCategory;
};

export type UpdateRiskTierInput = {
  name?: string;
  weight?: number;
  category?: RiskCategory;
};
