import type { UUID } from "@/shared/types";

export interface EpisodeData {
  id: UUID;
  source: string;
  sourceTraceId: string;
  ingestedAt: Date;
  occurredAt: Date | null;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  trace: Record<string, unknown>;
  outcomes: Record<string, unknown>;
  modelVersion: string | null;
  locale: string | null;
  planTier: string | null;
  device: string | null;
  scenarioTypeId: UUID | null;
  hasNegativeFeedback: boolean;
  artifactUri: string | null;
  artifactSizeBytes: number | null;
  metadata: Record<string, unknown>;
  piiRedactionCount: number;
  createdAt: Date;
  updatedAt: Date;
}
