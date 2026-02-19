import type { TypedDomainEvent } from "@/lib/events/DomainEvent";

import type { GateResult } from "./value-objects/GateResult";

export type DatasetVersionCreatedPayload = {
  dataset_version_id: string;
  suite_id: string;
  version: string;
};

export type DatasetVersionCreatedEvent = TypedDomainEvent<
  "dataset_version.created",
  DatasetVersionCreatedPayload
>;

export type DatasetVersionStateChangedPayload = {
  dataset_version_id: string;
  from_state: string;
  to_state: string;
};

export type DatasetVersionStateChangedEvent = TypedDomainEvent<
  "dataset_version.state_changed",
  DatasetVersionStateChangedPayload
>;

export type DiagnosticsCompletedPayload = {
  dataset_version_id: string;
  diagnostics_id: string;
  blocked: boolean;
  gate_results: GateResult[];
};

export type DiagnosticsCompletedEvent = TypedDomainEvent<
  "diagnostics.completed",
  DiagnosticsCompletedPayload
>;

export type DatasetVersionReleasedPayload = {
  dataset_version_id: string;
  suite_id: string;
  version: string;
  candidate_count: number;
};

export type DatasetVersionReleasedEvent = TypedDomainEvent<
  "dataset_version.released",
  DatasetVersionReleasedPayload
>;

export type DatasetVersionDeprecatedPayload = {
  dataset_version_id: string;
  reason: string;
};

export type DatasetVersionDeprecatedEvent = TypedDomainEvent<
  "dataset_version.deprecated",
  DatasetVersionDeprecatedPayload
>;

export type ReleaseGateBlockedPayload = {
  dataset_version_id: string;
  failed_gates: GateResult[];
};

export type ReleaseGateBlockedEvent = TypedDomainEvent<
  "release_gate.blocked",
  ReleaseGateBlockedPayload
>;
