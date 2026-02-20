import type { TypedDomainEvent } from "@/lib/events/DomainEvent";

export type EpisodeIngestedPayload = {
  episode_id: string;
  source: string;
  occurred_at: string | null;
  model_version: string | null;
  locale: string | null;
  plan_tier: string | null;
  device: string | null;
  has_negative_feedback: boolean;
  artifact_uri: string | null;
  scenario_type_id: string | null;
};

export type EpisodeIngestedEvent = TypedDomainEvent<
  "episode.ingested",
  EpisodeIngestedPayload
>;

export type BulkImportCompletedPayload = {
  bulk_source_id: string;
  source_label: string;
  total_rows: number;
  rows_succeeded: number;
  rows_failed: number;
  rows_deduplicated: number;
  status: string;
};

export type BulkImportCompletedEvent = TypedDomainEvent<
  "bulk_import.completed",
  BulkImportCompletedPayload
>;
