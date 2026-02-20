import type { UUID } from "@/shared/types";

export interface EmbeddingRow {
  id: UUID;
  candidateId: UUID;
  embedding: number[];
  modelId: string;
  modelVersion: string;
  tokenCount: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmbeddingRepository {
  upsert(row: Omit<EmbeddingRow, "createdAt" | "updatedAt">): Promise<void>;
  findByCandidateId(candidateId: UUID): Promise<EmbeddingRow | null>;
  findByCandidateIds(
    candidateIds: ReadonlyArray<UUID>
  ): Promise<Map<UUID, EmbeddingRow>>;
}
