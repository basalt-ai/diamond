import type { UUID } from "@/shared/types";

export interface EpisodeContent {
  id: UUID;
  inputText: string;
  outputText: string;
  turnCount: number;
  toolCallCount: number;
  hasNegativeFeedback: boolean;
  inputTokenCount: number;
  outputTokenCount: number;
  modelVersion: string | null;
  occurredAt: Date;
  piiRedactionStatus: "passed" | "failed" | "pending" | null;
}

export interface EpisodeReader {
  findById(id: UUID): Promise<EpisodeContent | null>;
  findByIds(ids: ReadonlyArray<UUID>): Promise<Map<UUID, EpisodeContent>>;
}
