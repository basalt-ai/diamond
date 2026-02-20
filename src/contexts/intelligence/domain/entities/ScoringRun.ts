import { AggregateRoot } from "@/lib/domain/AggregateRoot";
import { InvalidStateTransitionError } from "@/lib/domain/DomainError";
import type { UUID } from "@/shared/types";

export const SCORING_RUN_STATES = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const;
export type ScoringRunState = (typeof SCORING_RUN_STATES)[number];

const VALID_TRANSITIONS: Record<ScoringRunState, ScoringRunState[]> = {
  pending: ["processing"],
  processing: ["completed", "failed"],
  completed: [],
  failed: [],
};

export interface ScoringRunData {
  id: UUID;
  state: ScoringRunState;
  totalCandidates: number;
  processedCount: number;
  errorCount: number;
  embeddingModelId: string;
  triggeredBy: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ScoringRun extends AggregateRoot {
  private _state: ScoringRunState;
  private _totalCandidates: number;
  private _processedCount: number;
  private _errorCount: number;
  private _embeddingModelId: string;
  private _triggeredBy: string | null;
  private _startedAt: Date | null;
  private _completedAt: Date | null;
  private _error: string | null;
  private _createdAt: Date;
  private _updatedAt: Date;

  constructor(data: ScoringRunData) {
    super(data.id);
    this._state = data.state;
    this._totalCandidates = data.totalCandidates;
    this._processedCount = data.processedCount;
    this._errorCount = data.errorCount;
    this._embeddingModelId = data.embeddingModelId;
    this._triggeredBy = data.triggeredBy;
    this._startedAt = data.startedAt;
    this._completedAt = data.completedAt;
    this._error = data.error;
    this._createdAt = data.createdAt;
    this._updatedAt = data.updatedAt;
  }

  get state(): ScoringRunState {
    return this._state;
  }
  get totalCandidates(): number {
    return this._totalCandidates;
  }
  get processedCount(): number {
    return this._processedCount;
  }
  get errorCount(): number {
    return this._errorCount;
  }
  get embeddingModelId(): string {
    return this._embeddingModelId;
  }
  get triggeredBy(): string | null {
    return this._triggeredBy;
  }
  get startedAt(): Date | null {
    return this._startedAt;
  }
  get completedAt(): Date | null {
    return this._completedAt;
  }
  get error(): string | null {
    return this._error;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  transitionTo(targetState: ScoringRunState): void {
    const allowed = VALID_TRANSITIONS[this._state];
    if (!allowed.includes(targetState)) {
      throw new InvalidStateTransitionError(
        "ScoringRun",
        this._state,
        targetState
      );
    }

    this._state = targetState;
    this._updatedAt = new Date();

    if (targetState === "processing") {
      this._startedAt = new Date();
      this.addDomainEvent("scoring_run.started", {
        scoring_run_id: this.id,
      });
    }

    if (targetState === "completed") {
      this._completedAt = new Date();
      this.addDomainEvent("scoring_run.completed", {
        scoring_run_id: this.id,
        processed_count: this._processedCount,
        error_count: this._errorCount,
      });
    }

    if (targetState === "failed") {
      this._completedAt = new Date();
      this.addDomainEvent("scoring_run.failed", {
        scoring_run_id: this.id,
        error: this._error,
      });
    }
  }

  setTotalCandidates(count: number): void {
    this._totalCandidates = count;
    this._updatedAt = new Date();
  }

  incrementProcessed(): void {
    this._processedCount += 1;
    this._updatedAt = new Date();
  }

  incrementError(): void {
    this._errorCount += 1;
    this._updatedAt = new Date();
  }

  setError(error: string): void {
    this._error = error;
    this._updatedAt = new Date();
  }

  toData(): ScoringRunData {
    return {
      id: this.id,
      state: this._state,
      totalCandidates: this._totalCandidates,
      processedCount: this._processedCount,
      errorCount: this._errorCount,
      embeddingModelId: this._embeddingModelId,
      triggeredBy: this._triggeredBy,
      startedAt: this._startedAt,
      completedAt: this._completedAt,
      error: this._error,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
