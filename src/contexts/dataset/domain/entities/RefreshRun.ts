import type { UUID } from "@/shared/types";

import type { GraphChange } from "../services/VersionComputer";

export type RefreshRunStatus =
  | "pending_scenarios"
  | "pending_labeling"
  | "pending_diagnostics"
  | "pending_approval"
  | "released"
  | "failed";

export type RefreshRunTrigger =
  | "clustering_run"
  | "scenario_graph_updated"
  | "manual";

export interface RefreshRunData {
  id: UUID;
  suiteId: UUID;
  triggeredBy: RefreshRunTrigger;
  triggerEventId: string;
  status: RefreshRunStatus;
  scenarioChanges: GraphChange[];
  candidateCount: number;
  datasetVersionId: UUID | null;
  failureReason: string | null;
  startedAt: Date;
  completedAt: Date | null;
}
