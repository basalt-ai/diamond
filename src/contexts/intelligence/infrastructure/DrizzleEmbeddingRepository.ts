import { eq, inArray } from "drizzle-orm";

import type { Database } from "@/db";
import { inEmbeddings } from "@/db/schema/intelligence";
import type { UUID } from "@/shared/types";

import type {
  EmbeddingRepository,
  EmbeddingRow,
} from "../application/ports/EmbeddingRepository";

export class DrizzleEmbeddingRepository implements EmbeddingRepository {
  constructor(private readonly db: Database) {}

  async upsert(
    row: Omit<EmbeddingRow, "createdAt" | "updatedAt">
  ): Promise<void> {
    await this.db
      .insert(inEmbeddings)
      .values({
        id: row.id,
        candidateId: row.candidateId,
        embedding: row.embedding,
        modelId: row.modelId,
        modelVersion: row.modelVersion,
        tokenCount: row.tokenCount,
      })
      .onConflictDoUpdate({
        target: [inEmbeddings.candidateId, inEmbeddings.modelId],
        set: {
          embedding: row.embedding,
          modelVersion: row.modelVersion,
          tokenCount: row.tokenCount,
          updatedAt: new Date(),
        },
      });
  }

  async findByCandidateId(candidateId: UUID): Promise<EmbeddingRow | null> {
    const [row] = await this.db
      .select()
      .from(inEmbeddings)
      .where(eq(inEmbeddings.candidateId, candidateId));
    return row ? this.toRow(row) : null;
  }

  async findByCandidateIds(
    candidateIds: ReadonlyArray<UUID>
  ): Promise<Map<UUID, EmbeddingRow>> {
    if (candidateIds.length === 0) return new Map();

    const rows = await this.db
      .select()
      .from(inEmbeddings)
      .where(inArray(inEmbeddings.candidateId, [...candidateIds]));

    const map = new Map<UUID, EmbeddingRow>();
    for (const row of rows) {
      map.set(row.candidateId as UUID, this.toRow(row));
    }
    return map;
  }

  private toRow(row: typeof inEmbeddings.$inferSelect): EmbeddingRow {
    return {
      id: row.id as UUID,
      candidateId: row.candidateId as UUID,
      embedding: row.embedding as unknown as number[],
      modelId: row.modelId,
      modelVersion: row.modelVersion,
      tokenCount: row.tokenCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
