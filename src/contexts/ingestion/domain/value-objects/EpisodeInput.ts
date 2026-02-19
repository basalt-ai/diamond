export interface EpisodeInput {
  source: string;
  occurredAt?: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  trace?: Record<string, unknown>;
  outcomes?: Record<string, unknown>;
  userSegment?: {
    locale?: string;
    planTier?: string;
    device?: string;
  };
  modelVersion?: string;
  scenarioTypeId?: string;
  metadata?: Record<string, unknown>;
}
