import { AggregateRoot } from "@/lib/domain/AggregateRoot";
import { InvalidStateTransitionError } from "@/lib/domain/DomainError";
import type { UUID } from "@/shared/types";

export const CANDIDATE_STATES = [
  "raw",
  "scored",
  "selected",
  "labeled",
  "validated",
  "released",
] as const;
export type CandidateState = (typeof CANDIDATE_STATES)[number];

const VALID_TRANSITIONS: Record<CandidateState, CandidateState[]> = {
  raw: ["scored"],
  scored: ["selected"],
  selected: ["labeled"],
  labeled: ["validated"],
  validated: ["released"],
  released: [],
};

export interface CandidateData {
  id: UUID;
  episodeId: UUID;
  scenarioTypeId: UUID | null;
  state: CandidateState;
  mappingConfidence: number;
  scores: Record<string, unknown>;
  features: Record<string, unknown>;
  selectionRunId: UUID | null;
  embeddedAt: Date | null;
  scoringDirty: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCandidateInput {
  episode_id: string;
  scenario_type_id?: string;
}

export class Candidate extends AggregateRoot {
  private _episodeId: UUID;
  private _scenarioTypeId: UUID | null;
  private _state: CandidateState;
  private _mappingConfidence: number;
  private _scores: Record<string, unknown>;
  private _features: Record<string, unknown>;
  private _selectionRunId: UUID | null;
  private _embeddedAt: Date | null;
  private _scoringDirty: boolean;
  private _createdAt: Date;
  private _updatedAt: Date;

  constructor(data: CandidateData) {
    super(data.id);
    this._episodeId = data.episodeId;
    this._scenarioTypeId = data.scenarioTypeId;
    this._state = data.state;
    this._mappingConfidence = data.mappingConfidence;
    this._scores = data.scores;
    this._features = data.features;
    this._selectionRunId = data.selectionRunId;
    this._embeddedAt = data.embeddedAt;
    this._scoringDirty = data.scoringDirty;
    this._createdAt = data.createdAt;
    this._updatedAt = data.updatedAt;
  }

  get episodeId(): UUID {
    return this._episodeId;
  }
  get scenarioTypeId(): UUID | null {
    return this._scenarioTypeId;
  }
  get state(): CandidateState {
    return this._state;
  }
  get mappingConfidence(): number {
    return this._mappingConfidence;
  }
  get scores(): Record<string, unknown> {
    return this._scores;
  }
  get features(): Record<string, unknown> {
    return this._features;
  }
  get selectionRunId(): UUID | null {
    return this._selectionRunId;
  }
  get embeddedAt(): Date | null {
    return this._embeddedAt;
  }
  get scoringDirty(): boolean {
    return this._scoringDirty;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  markEmbedded(): void {
    this._embeddedAt = new Date();
    this._updatedAt = new Date();
  }

  markDirty(): void {
    this._scoringDirty = true;
    this._updatedAt = new Date();
  }

  markClean(): void {
    this._scoringDirty = false;
    this._updatedAt = new Date();
  }

  transitionTo(targetState: CandidateState): void {
    const allowed = VALID_TRANSITIONS[this._state];
    if (!allowed.includes(targetState)) {
      throw new InvalidStateTransitionError(
        "Candidate",
        this._state,
        targetState
      );
    }

    const fromState = this._state;
    this._state = targetState;
    this._updatedAt = new Date();

    this.addDomainEvent("candidate.state_changed", {
      candidate_id: this.id,
      from_state: fromState,
      to_state: targetState,
    });
  }

  toData(): CandidateData {
    return {
      id: this.id,
      episodeId: this._episodeId,
      scenarioTypeId: this._scenarioTypeId,
      state: this._state,
      mappingConfidence: this._mappingConfidence,
      scores: this._scores,
      features: this._features,
      selectionRunId: this._selectionRunId,
      embeddedAt: this._embeddedAt,
      scoringDirty: this._scoringDirty,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
