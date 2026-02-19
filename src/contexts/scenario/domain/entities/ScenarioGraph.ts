import type { UUID } from "@/shared/types";

export type GraphSnapshot = {
  scenarioTypes: Array<{
    id: string;
    name: string;
    description: string;
    parentId: string | null;
    archived: boolean;
    riskTier: { id: string; name: string; weight: number; category: string };
    failureModes: Array<{
      id: string;
      name: string;
      description: string;
      severity: string;
    }>;
    contextProfiles: Array<{
      id: string;
      name: string;
      attributes: Record<string, unknown>;
    }>;
    rubricIds: string[];
  }>;
  failureModes: Array<{
    id: string;
    name: string;
    description: string;
    severity: string;
  }>;
  riskTiers: Array<{
    id: string;
    name: string;
    weight: number;
    category: string;
  }>;
  contextProfiles: Array<{
    id: string;
    name: string;
    attributes: Record<string, unknown>;
  }>;
};

export type GraphChange = {
  changeType: "added" | "modified" | "removed" | "archived";
  entityType:
    | "scenario_type"
    | "failure_mode"
    | "risk_tier"
    | "context_profile";
  entityId: string;
  summary: string;
};

export interface ScenarioGraphVersionData {
  id: UUID;
  version: number;
  snapshot: GraphSnapshot;
  changes: GraphChange[];
  createdAt: Date;
}
