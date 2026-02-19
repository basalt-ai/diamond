export interface NormalizedEpisode {
  sourceTraceId: string;
  occurredAt: Date | null;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  trace: Record<string, unknown>;
  outcomes: Record<string, unknown>;
  userSegment: { locale?: string; planTier?: string; device?: string };
  modelVersion: string | null;
  hasNegativeFeedback: boolean;
  metadata: Record<string, unknown>;
}

export interface EpisodeConnector {
  readonly sourceType: string;
  normalize(rawPayload: Record<string, unknown>): NormalizedEpisode;
}
