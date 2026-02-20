import { AggregateRoot } from "@/lib/domain/AggregateRoot";
import { InvalidStateTransitionError } from "@/lib/domain/DomainError";
import type { UUID } from "@/shared/types";

export const CLUSTERING_RUN_STATES = [
  "pending",
  "running",
  "completed",
  "failed",
] as const;
export type ClusteringRunState = (typeof CLUSTERING_RUN_STATES)[number];

const VALID_TRANSITIONS: Record<ClusteringRunState, ClusteringRunState[]> = {
  pending: ["running"],
  running: ["completed", "failed"],
  completed: [],
  failed: [],
};

export interface ClusterData {
  id: UUID;
  label: number;
  size: number;
  candidateIds: UUID[];
  representativeCandidateIds: UUID[];
  suggestedName: string | null;
  suggestedDescription: string | null;
  inducedScenarioTypeId: UUID | null;
  centroid: number[] | null;
}

export interface ClusteringRunParams {
  minClusterSize: number;
  minSamples: number;
  algorithm: string;
}

export interface ClusteringRunData {
  id: UUID;
  state: ClusteringRunState;
  params: ClusteringRunParams;
  totalCandidates: number;
  clusterCount: number;
  noiseCount: number;
  errorMessage: string | null;
  triggeredBy: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  clusters: ClusterData[];
}

export class ClusteringRun extends AggregateRoot {
  private _state: ClusteringRunState;
  private _params: ClusteringRunParams;
  private _totalCandidates: number;
  private _clusterCount: number;
  private _noiseCount: number;
  private _errorMessage: string | null;
  private _triggeredBy: string | null;
  private _startedAt: Date | null;
  private _completedAt: Date | null;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _clusters: ClusterData[];

  constructor(data: ClusteringRunData) {
    super(data.id);
    this._state = data.state;
    this._params = data.params;
    this._totalCandidates = data.totalCandidates;
    this._clusterCount = data.clusterCount;
    this._noiseCount = data.noiseCount;
    this._errorMessage = data.errorMessage;
    this._triggeredBy = data.triggeredBy;
    this._startedAt = data.startedAt;
    this._completedAt = data.completedAt;
    this._createdAt = data.createdAt;
    this._updatedAt = data.updatedAt;
    this._clusters = data.clusters;
  }

  get state(): ClusteringRunState {
    return this._state;
  }
  get params(): ClusteringRunParams {
    return this._params;
  }
  get totalCandidates(): number {
    return this._totalCandidates;
  }
  get clusterCount(): number {
    return this._clusterCount;
  }
  get noiseCount(): number {
    return this._noiseCount;
  }
  get clusters(): ClusterData[] {
    return this._clusters;
  }
  get triggeredBy(): string | null {
    return this._triggeredBy;
  }
  get createdAt(): Date {
    return this._createdAt;
  }

  transitionTo(targetState: ClusteringRunState): void {
    const allowed = VALID_TRANSITIONS[this._state];
    if (!allowed.includes(targetState)) {
      throw new InvalidStateTransitionError(
        "ClusteringRun",
        this._state,
        targetState
      );
    }
    this._state = targetState;
    this._updatedAt = new Date();

    if (targetState === "running") {
      this._startedAt = new Date();
    }

    if (targetState === "completed" || targetState === "failed") {
      this._completedAt = new Date();
    }
  }

  complete(
    clusters: ClusterData[],
    totalCandidates: number,
    noiseCount: number
  ): void {
    this._clusters = clusters;
    this._totalCandidates = totalCandidates;
    this._clusterCount = clusters.length;
    this._noiseCount = noiseCount;
    this.transitionTo("completed");
    this.addDomainEvent("clustering_run.completed", {
      clustering_run_id: this.id,
      cluster_count: clusters.length,
      total_candidates: totalCandidates,
      noise_count: noiseCount,
    });
  }

  fail(error: string): void {
    this._errorMessage = error;
    this.transitionTo("failed");
    this.addDomainEvent("clustering_run.failed", {
      clustering_run_id: this.id,
      error,
    });
  }

  toData(): ClusteringRunData {
    return {
      id: this.id,
      state: this._state,
      params: this._params,
      totalCandidates: this._totalCandidates,
      clusterCount: this._clusterCount,
      noiseCount: this._noiseCount,
      errorMessage: this._errorMessage,
      triggeredBy: this._triggeredBy,
      startedAt: this._startedAt,
      completedAt: this._completedAt,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      clusters: this._clusters,
    };
  }
}
