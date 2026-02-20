import { desc, eq, or } from "drizzle-orm";

import type { Database } from "@/db";
import { inScoringRuns } from "@/db/schema/intelligence";
import type { UUID } from "@/shared/types";

import type { ScoringRunRepository } from "../application/ports/ScoringRunRepository";
import {
  ScoringRun,
  type ScoringRunData,
  type ScoringRunState,
} from "../domain/entities/ScoringRun";

export class DrizzleScoringRunRepository implements ScoringRunRepository {
  constructor(private readonly db: Database) {}

  async save(run: ScoringRun): Promise<void> {
    const data = run.toData();
    await this.db
      .insert(inScoringRuns)
      .values({
        id: data.id,
        state: data.state,
        totalCandidates: data.totalCandidates,
        processedCount: data.processedCount,
        errorCount: data.errorCount,
        embeddingModelId: data.embeddingModelId,
        triggeredBy: data.triggeredBy,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
        error: data.error,
      })
      .onConflictDoUpdate({
        target: inScoringRuns.id,
        set: {
          state: data.state,
          totalCandidates: data.totalCandidates,
          processedCount: data.processedCount,
          errorCount: data.errorCount,
          startedAt: data.startedAt,
          completedAt: data.completedAt,
          error: data.error,
          updatedAt: new Date(),
        },
      });
  }

  async findById(id: UUID): Promise<ScoringRun | null> {
    const [row] = await this.db
      .select()
      .from(inScoringRuns)
      .where(eq(inScoringRuns.id, id));
    return row ? this.toEntity(row) : null;
  }

  async findActive(): Promise<ScoringRun | null> {
    const [row] = await this.db
      .select()
      .from(inScoringRuns)
      .where(
        or(
          eq(inScoringRuns.state, "pending"),
          eq(inScoringRuns.state, "processing")
        )
      )
      .limit(1);
    return row ? this.toEntity(row) : null;
  }

  async list(options?: {
    limit?: number;
    offset?: number;
  }): Promise<ScoringRun[]> {
    const rows = await this.db
      .select()
      .from(inScoringRuns)
      .orderBy(desc(inScoringRuns.createdAt))
      .limit(options?.limit ?? 20)
      .offset(options?.offset ?? 0);
    return rows.map((r) => this.toEntity(r));
  }

  private toEntity(row: typeof inScoringRuns.$inferSelect): ScoringRun {
    const data: ScoringRunData = {
      id: row.id as UUID,
      state: row.state as ScoringRunState,
      totalCandidates: row.totalCandidates,
      processedCount: row.processedCount,
      errorCount: row.errorCount,
      embeddingModelId: row.embeddingModelId,
      triggeredBy: row.triggeredBy,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      error: row.error,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    return new ScoringRun(data);
  }
}
