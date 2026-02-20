import { eq, inArray, sql } from "drizzle-orm";

import type { Database } from "@/db";
import { cdCandidates } from "@/db/schema/candidate";
import type { UUID } from "@/shared/types";

import type { CandidateMapper } from "../../application/ports/CandidateMapper";

export class CandidateContextAdapter implements CandidateMapper {
  constructor(private readonly db: Database) {}

  async mapToScenario(
    candidateIds: UUID[],
    scenarioTypeId: UUID,
    confidence: number
  ): Promise<void> {
    if (candidateIds.length === 0) return;

    await this.db
      .update(cdCandidates)
      .set({
        scenarioTypeId,
        mappingConfidence: confidence,
        updatedAt: sql`now()`,
      })
      .where(inArray(cdCandidates.id, candidateIds));
  }
}
