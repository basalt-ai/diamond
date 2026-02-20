import type { TypedDomainEvent } from "@/lib/events/DomainEvent";

export type CandidateEmbeddedPayload = {
  candidate_id: string;
  model_id: string;
  token_count: number;
};

export type CandidateEmbeddedEvent = TypedDomainEvent<
  "candidate.embedded",
  CandidateEmbeddedPayload
>;

export type CandidateScoredPayload = {
  candidate_id: string;
  scoring_run_id: string;
};

export type CandidateScoredEvent = TypedDomainEvent<
  "candidate.scored",
  CandidateScoredPayload
>;

export type ScoringRunCompletedPayload = {
  scoring_run_id: string;
  processed_count: number;
  error_count: number;
};

export type ScoringRunCompletedEvent = TypedDomainEvent<
  "scoring_run.completed",
  ScoringRunCompletedPayload
>;

export type SelectionRunCompletedPayload = {
  selection_run_id: string;
  selected_count: number;
};

export type SelectionRunCompletedEvent = TypedDomainEvent<
  "selection_run.completed",
  SelectionRunCompletedPayload
>;

export type UnmappedClusterDetectedPayload = {
  cluster_id: string;
  episode_count: number;
  representative_episode_ids: string[];
};

export type UnmappedClusterDetectedEvent = TypedDomainEvent<
  "unmapped_cluster.detected",
  UnmappedClusterDetectedPayload
>;
