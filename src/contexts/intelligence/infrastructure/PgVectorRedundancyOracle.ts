import { sql } from "drizzle-orm";

import type { Database } from "@/db";
import type { UUID } from "@/shared/types";

import type { RedundancyOracle } from "../application/ports/RedundancyOracle";

export class PgVectorRedundancyOracle implements RedundancyOracle {
  constructor(private readonly db: Database) {}

  async computeRedundancy(
    candidateId: UUID,
    selectedIds: ReadonlyArray<UUID>
  ): Promise<number> {
    if (selectedIds.length === 0) return 0;

    const result = await this.db.execute(sql`
      SELECT MAX(1 - (e1.embedding <=> e2.embedding)) AS max_similarity
      FROM in_embeddings e1
      CROSS JOIN LATERAL (
        SELECT embedding FROM in_embeddings e2
        WHERE e2.candidate_id = ANY(${[...selectedIds]})
        ORDER BY e1.embedding <=> e2.embedding
        LIMIT 1
      ) e2
      WHERE e1.candidate_id = ${candidateId}
    `);

    const row = (result as unknown as Array<{ max_similarity: number }>)[0];
    return row?.max_similarity ?? 0;
  }

  async computeRedundancyBatch(
    candidateIds: ReadonlyArray<UUID>,
    selectedIds: ReadonlyArray<UUID>
  ): Promise<Map<UUID, number>> {
    const results = new Map<UUID, number>();

    if (candidateIds.length === 0) return results;
    if (selectedIds.length === 0) {
      for (const id of candidateIds) results.set(id, 0);
      return results;
    }

    const rows = await this.db.execute(sql`
      SELECT e1.candidate_id,
             MAX(1 - (e1.embedding <=> e2.embedding)) AS max_similarity
      FROM in_embeddings e1
      CROSS JOIN LATERAL (
        SELECT embedding FROM in_embeddings e2
        WHERE e2.candidate_id = ANY(${[...selectedIds]})
        ORDER BY e1.embedding <=> e2.embedding
        LIMIT 1
      ) e2
      WHERE e1.candidate_id = ANY(${[...candidateIds]})
      GROUP BY e1.candidate_id
    `);

    for (const row of rows as unknown as Array<{
      candidate_id: string;
      max_similarity: number;
    }>) {
      results.set(row.candidate_id as UUID, row.max_similarity);
    }

    // Fill in 0 for any candidates not found (no embedding)
    for (const id of candidateIds) {
      if (!results.has(id)) results.set(id, 0);
    }

    return results;
  }

  async computeNovelty(candidateId: UUID): Promise<number> {
    // Novelty = 1 - max similarity to any OTHER embedding
    const result = await this.db.execute(sql`
      SELECT 1 - MIN(e1.embedding <=> e2.embedding) AS max_similarity
      FROM in_embeddings e1
      CROSS JOIN LATERAL (
        SELECT embedding FROM in_embeddings e2
        WHERE e2.candidate_id != e1.candidate_id
        ORDER BY e1.embedding <=> e2.embedding
        LIMIT 1
      ) e2
      WHERE e1.candidate_id = ${candidateId}
    `);

    const row = (result as unknown as Array<{ max_similarity: number }>)[0];
    const similarity = row?.max_similarity ?? 0;
    return 1 - similarity; // Higher = more novel
  }

  async computeNoveltyBatch(
    candidateIds: ReadonlyArray<UUID>
  ): Promise<Map<UUID, number>> {
    const results = new Map<UUID, number>();
    if (candidateIds.length === 0) return results;

    const rows = await this.db.execute(sql`
      SELECT e1.candidate_id,
             1 - MIN(e1.embedding <=> e2.embedding) AS max_similarity
      FROM in_embeddings e1
      CROSS JOIN LATERAL (
        SELECT embedding FROM in_embeddings e2
        WHERE e2.candidate_id != e1.candidate_id
        ORDER BY e1.embedding <=> e2.embedding
        LIMIT 1
      ) e2
      WHERE e1.candidate_id = ANY(${[...candidateIds]})
      GROUP BY e1.candidate_id
    `);

    for (const row of rows as unknown as Array<{
      candidate_id: string;
      max_similarity: number;
    }>) {
      results.set(row.candidate_id as UUID, 1 - row.max_similarity);
    }

    for (const id of candidateIds) {
      if (!results.has(id)) results.set(id, 1); // If no neighbors, maximally novel
    }

    return results;
  }
}
