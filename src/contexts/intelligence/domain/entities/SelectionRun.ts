import { AggregateRoot } from "@/lib/domain/AggregateRoot";
import { InvalidStateTransitionError } from "@/lib/domain/DomainError";
import type { UUID } from "@/shared/types";

export const SELECTION_RUN_STATES = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const;
export type SelectionRunState = (typeof SELECTION_RUN_STATES)[number];

const VALID_TRANSITIONS: Record<SelectionRunState, SelectionRunState[]> = {
  pending: ["processing"],
  processing: ["completed", "failed"],
  completed: [],
  failed: [],
};

export interface SelectionConstraints {
  budget: number;
}

export interface SelectionRunData {
  id: UUID;
  state: SelectionRunState;
  constraints: SelectionConstraints;
  selectedCount: number;
  totalPoolSize: number;
  coverageImprovement: number | null;
  triggeredBy: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class SelectionRun extends AggregateRoot {
  private _state: SelectionRunState;
  private _constraints: SelectionConstraints;
  private _selectedCount: number;
  private _totalPoolSize: number;
  private _coverageImprovement: number | null;
  private _triggeredBy: string | null;
  private _startedAt: Date | null;
  private _completedAt: Date | null;
  private _error: string | null;
  private _createdAt: Date;
  private _updatedAt: Date;

  constructor(data: SelectionRunData) {
    super(data.id);
    this._state = data.state;
    this._constraints = data.constraints;
    this._selectedCount = data.selectedCount;
    this._totalPoolSize = data.totalPoolSize;
    this._coverageImprovement = data.coverageImprovement;
    this._triggeredBy = data.triggeredBy;
    this._startedAt = data.startedAt;
    this._completedAt = data.completedAt;
    this._error = data.error;
    this._createdAt = data.createdAt;
    this._updatedAt = data.updatedAt;
  }

  get state(): SelectionRunState {
    return this._state;
  }
  get constraints(): SelectionConstraints {
    return this._constraints;
  }
  get selectedCount(): number {
    return this._selectedCount;
  }
  get totalPoolSize(): number {
    return this._totalPoolSize;
  }
  get coverageImprovement(): number | null {
    return this._coverageImprovement;
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

  transitionTo(targetState: SelectionRunState): void {
    const allowed = VALID_TRANSITIONS[this._state];
    if (!allowed.includes(targetState)) {
      throw new InvalidStateTransitionError(
        "SelectionRun",
        this._state,
        targetState
      );
    }

    this._state = targetState;
    this._updatedAt = new Date();

    if (targetState === "processing") {
      this._startedAt = new Date();
    }

    if (targetState === "completed") {
      this._completedAt = new Date();
      this.addDomainEvent("selection_run.completed", {
        selection_run_id: this.id,
        selected_count: this._selectedCount,
      });
    }

    if (targetState === "failed") {
      this._completedAt = new Date();
      this.addDomainEvent("selection_run.failed", {
        selection_run_id: this.id,
        error: this._error,
      });
    }
  }

  setResults(
    selectedCount: number,
    totalPoolSize: number,
    coverageImprovement: number
  ): void {
    this._selectedCount = selectedCount;
    this._totalPoolSize = totalPoolSize;
    this._coverageImprovement = coverageImprovement;
    this._updatedAt = new Date();
  }

  setError(error: string): void {
    this._error = error;
    this._updatedAt = new Date();
  }

  toData(): SelectionRunData {
    return {
      id: this.id,
      state: this._state,
      constraints: this._constraints,
      selectedCount: this._selectedCount,
      totalPoolSize: this._totalPoolSize,
      coverageImprovement: this._coverageImprovement,
      triggeredBy: this._triggeredBy,
      startedAt: this._startedAt,
      completedAt: this._completedAt,
      error: this._error,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
