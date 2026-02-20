import type { UUID } from "@/shared/types";

export interface ScenarioTypeData {
  id: UUID;
  name: string;
  description: string;
  parentId: UUID | null;
  riskTierId: UUID;
  needsReview: boolean;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScenarioTypeWithRelations extends ScenarioTypeData {
  failureModeIds: UUID[];
  contextProfileIds: UUID[];
}

export type CreateScenarioTypeInput = {
  name: string;
  description?: string;
  parentId?: string | null;
  riskTierId: string;
  needsReview?: boolean;
  failureModeIds?: string[];
  contextProfileIds?: string[];
};

export type UpdateScenarioTypeInput = {
  name?: string;
  description?: string;
  parentId?: string | null;
  riskTierId?: string;
  failureModeIds?: string[];
  contextProfileIds?: string[];
};

export type ListScenarioTypesFilter = {
  parentId?: string | null;
  riskTierId?: string;
  archived?: boolean;
  name?: string;
};
