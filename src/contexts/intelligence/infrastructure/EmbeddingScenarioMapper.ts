import { eq, sql } from "drizzle-orm";

import type { Database } from "@/db";
import { cdCandidates } from "@/db/schema/candidate";
import { inEmbeddings, inScenarioCentroids } from "@/db/schema/intelligence";
import type { UUID } from "@/shared/types";

import type {
  MappingResult,
  ScenarioMapper,
} from "../application/ports/ScenarioMapper";

const DEFAULT_THRESHOLD = 0.7;

export class EmbeddingScenarioMapper implements ScenarioMapper {
  constructor(
    private readonly db: Database,
    private readonly threshold: number = DEFAULT_THRESHOLD
  ) {}

  async map(
    _candidateId: UUID,
    embedding: number[]
  ): Promise<MappingResult | null> {
    // Find the closest centroid using cosine similarity
    const embeddingStr = `[${embedding.join(",")}]`;

    const results = await this.db
      .select({
        scenarioTypeId: inScenarioCentroids.scenarioTypeId,
        similarity: sql<number>`1 - (${inScenarioCentroids.centroid} <=> ${embeddingStr}::vector)`,
      })
      .from(inScenarioCentroids)
      .orderBy(sql`${inScenarioCentroids.centroid} <=> ${embeddingStr}::vector`)
      .limit(1);

    const best = results[0];
    if (!best || best.similarity < this.threshold) {
      return null;
    }

    return {
      scenarioTypeId: best.scenarioTypeId as UUID,
      confidence: best.similarity,
    };
  }

  async updateCentroids(): Promise<void> {
    // Compute average embedding per scenario type from mapped candidates
    // Uses a raw SQL query since Drizzle doesn't have native vector aggregation
    await this.db.execute(sql`
      INSERT INTO in_scenario_centroids (scenario_type_id, centroid, candidate_count, updated_at)
      SELECT
        c.scenario_type_id,
        AVG(e.embedding::vector(1536))::vector(1536),
        COUNT(*),
        NOW()
      FROM cd_candidates c
      JOIN in_embeddings e ON e.candidate_id = c.id
      WHERE c.scenario_type_id IS NOT NULL
      GROUP BY c.scenario_type_id
      ON CONFLICT (scenario_type_id)
      DO UPDATE SET
        centroid = EXCLUDED.centroid,
        candidate_count = EXCLUDED.candidate_count,
        updated_at = NOW()
    `);
  }
}
