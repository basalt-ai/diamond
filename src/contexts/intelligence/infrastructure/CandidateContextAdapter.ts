import { and, count, eq, isNull, sql } from "drizzle-orm";

import type { Database } from "@/db";
import { cdCandidates } from "@/db/schema/candidate";
import type { UUID } from "@/shared/types";

import type {
  CandidateReader,
  CandidateSnapshot,
} from "../application/ports/CandidateReader";

export class CandidateContextAdapter implements CandidateReader {
  constructor(private readonly db: Database) {}

  async findById(id: UUID): Promise<CandidateSnapshot | null> {
    const [row] = await this.db
      .select()
      .from(cdCandidates)
      .where(eq(cdCandidates.id, id));
    return row ? this.toSnapshot(row) : null;
  }

  async findDirty(limit = 500): Promise<CandidateSnapshot[]> {
    const rows = await this.db
      .select()
      .from(cdCandidates)
      .where(eq(cdCandidates.scoringDirty, true))
      .limit(limit);
    return rows.map((r) => this.toSnapshot(r));
  }

  async findUnembedded(limit = 500): Promise<CandidateSnapshot[]> {
    const rows = await this.db
      .select()
      .from(cdCandidates)
      .where(isNull(cdCandidates.embeddedAt))
      .limit(limit);
    return rows.map((r) => this.toSnapshot(r));
  }

  async findScored(): Promise<CandidateSnapshot[]> {
    const rows = await this.db
      .select()
      .from(cdCandidates)
      .where(eq(cdCandidates.state, "scored"));
    return rows.map((r) => this.toSnapshot(r));
  }

  async countByState(): Promise<Record<string, number>> {
    const rows = await this.db
      .select({
        state: cdCandidates.state,
        count: count(),
      })
      .from(cdCandidates)
      .groupBy(cdCandidates.state);

    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.state] = row.count;
    }
    return result;
  }

  private toSnapshot(row: typeof cdCandidates.$inferSelect): CandidateSnapshot {
    return {
      id: row.id as UUID,
      episodeId: row.episodeId as UUID,
      scenarioTypeId: row.scenarioTypeId as UUID | null,
      state: row.state,
      scores: (row.scores as Record<string, number>) ?? null,
      features: (row.features as Record<string, unknown>) ?? null,
      embeddedAt: row.embeddedAt,
      scoringDirty: row.scoringDirty,
    };
  }
}
