import { AggregateRoot } from "@/lib/domain/AggregateRoot";
import { InvalidStateTransitionError } from "@/lib/domain/DomainError";
import type { UUID } from "@/shared/types";

import { DatasetImmutableError } from "../errors";
import type { GateResult } from "../value-objects/GateResult";
import type { LineageData } from "../value-objects/Lineage";

export const DATASET_VERSION_STATES = [
  "draft",
  "validating",
  "released",
  "deprecated",
] as const;
export type DatasetVersionState = (typeof DATASET_VERSION_STATES)[number];

const VALID_TRANSITIONS: Record<DatasetVersionState, DatasetVersionState[]> = {
  draft: ["validating"],
  validating: ["released", "draft"],
  released: ["deprecated"],
  deprecated: [],
};

export interface DatasetVersionData {
  id: UUID;
  suiteId: UUID;
  version: string;
  state: DatasetVersionState;
  scenarioGraphVersion: string;
  selectionPolicy: Record<string, unknown>;
  candidateIds: string[];
  lineage: LineageData | null;
  gateResults: GateResult[] | null;
  diagnosticsId: UUID | null;
  createdAt: Date;
  updatedAt: Date;
  releasedAt: Date | null;
}

export class DatasetVersion extends AggregateRoot {
  private _suiteId: UUID;
  private _version: string;
  private _state: DatasetVersionState;
  private _scenarioGraphVersion: string;
  private _selectionPolicy: Record<string, unknown>;
  private _candidateIds: string[];
  private _lineage: LineageData | null;
  private _gateResults: GateResult[] | null;
  private _diagnosticsId: UUID | null;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _releasedAt: Date | null;

  constructor(data: DatasetVersionData) {
    super(data.id);
    this._suiteId = data.suiteId;
    this._version = data.version;
    this._state = data.state;
    this._scenarioGraphVersion = data.scenarioGraphVersion;
    this._selectionPolicy = data.selectionPolicy;
    this._candidateIds = data.candidateIds;
    this._lineage = data.lineage;
    this._gateResults = data.gateResults;
    this._diagnosticsId = data.diagnosticsId;
    this._createdAt = data.createdAt;
    this._updatedAt = data.updatedAt;
    this._releasedAt = data.releasedAt;
  }

  get suiteId(): UUID {
    return this._suiteId;
  }
  get version(): string {
    return this._version;
  }
  get state(): DatasetVersionState {
    return this._state;
  }
  get scenarioGraphVersion(): string {
    return this._scenarioGraphVersion;
  }
  get selectionPolicy(): Record<string, unknown> {
    return this._selectionPolicy;
  }
  get candidateIds(): string[] {
    return this._candidateIds;
  }
  get lineage(): LineageData | null {
    return this._lineage;
  }
  get gateResults(): GateResult[] | null {
    return this._gateResults;
  }
  get diagnosticsId(): UUID | null {
    return this._diagnosticsId;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get releasedAt(): Date | null {
    return this._releasedAt;
  }

  transitionTo(targetState: DatasetVersionState): void {
    const allowed = VALID_TRANSITIONS[this._state];
    if (!allowed.includes(targetState)) {
      throw new InvalidStateTransitionError(
        "DatasetVersion",
        this._state,
        targetState
      );
    }

    const fromState = this._state;
    this._state = targetState;
    this._updatedAt = new Date();

    this.addDomainEvent("dataset_version.state_changed", {
      dataset_version_id: this.id,
      from_state: fromState,
      to_state: targetState,
    });
  }

  startValidation(): void {
    this.transitionTo("validating");
  }

  release(gateResults: GateResult[]): void {
    this._gateResults = gateResults;
    this.transitionTo("released");
    this._releasedAt = new Date();

    this.addDomainEvent("dataset_version.released", {
      dataset_version_id: this.id,
      suite_id: this._suiteId,
      version: this._version,
      candidate_count: this._candidateIds.length,
    });
  }

  rejectToDraft(gateResults: GateResult[]): void {
    this._gateResults = gateResults;
    this.transitionTo("draft");

    this.addDomainEvent("release_gate.blocked", {
      dataset_version_id: this.id,
      failed_gates: gateResults.filter((g) => !g.passed),
    });
  }

  deprecate(reason?: string): void {
    this.transitionTo("deprecated");

    this.addDomainEvent("dataset_version.deprecated", {
      dataset_version_id: this.id,
      reason: reason ?? "",
    });
  }

  setDiagnosticsId(diagnosticsId: UUID): void {
    if (this._state === "released") {
      throw new DatasetImmutableError(this.id);
    }
    this._diagnosticsId = diagnosticsId;
    this._updatedAt = new Date();
  }

  toData(): DatasetVersionData {
    return {
      id: this.id,
      suiteId: this._suiteId,
      version: this._version,
      state: this._state,
      scenarioGraphVersion: this._scenarioGraphVersion,
      selectionPolicy: this._selectionPolicy,
      candidateIds: this._candidateIds,
      lineage: this._lineage,
      gateResults: this._gateResults,
      diagnosticsId: this._diagnosticsId,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      releasedAt: this._releasedAt,
    };
  }
}
