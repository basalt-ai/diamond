import { count, eq, gte, sql } from "drizzle-orm";

import { db } from "@/db";
import { cdCandidates } from "@/db/schema/candidate";
import type { UUID } from "@/shared/types";

import type { ProductionDistributionReader } from "../application/ports/ProductionDistributionReader";

export class CandidateDistributionAdapter implements ProductionDistributionReader {
  async getScenarioDistribution(days: number): Promise<Map<UUID, number>> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const rows = await db
      .select({
        scenarioTypeId: cdCandidates.scenarioTypeId,
        count: count(),
      })
      .from(cdCandidates)
      .where(gte(cdCandidates.createdAt, cutoff))
      .groupBy(cdCandidates.scenarioTypeId);

    const result = new Map<UUID, number>();
    for (const row of rows) {
      if (row.scenarioTypeId) {
        result.set(row.scenarioTypeId as UUID, row.count);
      }
    }
    return result;
  }

  async getTotalCandidateCount(days: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const [result] = await db
      .select({ value: count() })
      .from(cdCandidates)
      .where(gte(cdCandidates.createdAt, cutoff));

    return result?.value ?? 0;
  }
}
