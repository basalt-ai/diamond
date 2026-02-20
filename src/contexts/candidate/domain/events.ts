import type { TypedDomainEvent } from "@/lib/events/DomainEvent";

export type CandidateCreatedPayload = {
  candidate_id: string;
  episode_id: string;
  scenario_type_id: string | null;
};

export type CandidateCreatedEvent = TypedDomainEvent<
  "candidate.created",
  CandidateCreatedPayload
>;

export type CandidateStateChangedPayload = {
  candidate_id: string;
  from_state: string;
  to_state: string;
  scenario_type_id: string | null;
};

export type CandidateStateChangedEvent = TypedDomainEvent<
  "candidate.state_changed",
  CandidateStateChangedPayload
>;
