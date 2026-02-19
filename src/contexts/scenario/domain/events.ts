import type { TypedDomainEvent } from "@/lib/events/DomainEvent";

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

export type ScenarioGraphUpdatedPayload = {
  previousVersion: number;
  newVersion: number;
  changes: GraphChange[];
};

export type ScenarioGraphUpdatedEvent = TypedDomainEvent<
  "scenario_graph.updated",
  ScenarioGraphUpdatedPayload
>;

export type RubricVersionCreatedPayload = {
  rubricId: string;
  scenarioTypeId: string;
  previousVersion: number | null;
  newVersion: number;
  changeSummary: string;
};

export type RubricVersionCreatedEvent = TypedDomainEvent<
  "rubric.version_created",
  RubricVersionCreatedPayload
>;
