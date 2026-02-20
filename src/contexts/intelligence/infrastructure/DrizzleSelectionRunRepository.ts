import { desc, eq, or } from "drizzle-orm";

import type { Database } from "@/db";
import { inSelectionRuns } from "@/db/schema/intelligence";
import type { UUID } from "@/shared/types";

import type { SelectionRunRepository } from "../application/ports/SelectionRunRepository";
import {
  SelectionRun,
  type SelectionConstraints,
  type SelectionRunData,
  type SelectionRunState,
} from "../domain/entities/SelectionRun";

export class DrizzleSelectionRunRepository implements SelectionRunRepository {
  constructor(private readonly db: Database) {}

  async save(run: SelectionRun): Promise<void> {
    const data = run.toData();
    await this.db
      .insert(inSelectionRuns)
      .values({
        id: data.id,
        state: data.state,
        constraints: data.constraints,
        selectedCount: data.selectedCount,
        totalPoolSize: data.totalPoolSize,
        coverageImprovement: data.coverageImprovement,
        triggeredBy: data.triggeredBy,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
        error: data.error,
      })
      .onConflictDoUpdate({
        target: inSelectionRuns.id,
        set: {
          state: data.state,
          selectedCount: data.selectedCount,
          totalPoolSize: data.totalPoolSize,
          coverageImprovement: data.coverageImprovement,
          startedAt: data.startedAt,
          completedAt: data.completedAt,
          error: data.error,
          updatedAt: new Date(),
        },
      });
  }

  async findById(id: UUID): Promise<SelectionRun | null> {
    const [row] = await this.db
      .select()
      .from(inSelectionRuns)
      .where(eq(inSelectionRuns.id, id));
    return row ? this.toEntity(row) : null;
  }

  async findActive(): Promise<SelectionRun | null> {
    const [row] = await this.db
      .select()
      .from(inSelectionRuns)
      .where(
        or(
          eq(inSelectionRuns.state, "pending"),
          eq(inSelectionRuns.state, "processing")
        )
      )
      .limit(1);
    return row ? this.toEntity(row) : null;
  }

  async list(options?: {
    limit?: number;
    offset?: number;
  }): Promise<SelectionRun[]> {
    const rows = await this.db
      .select()
      .from(inSelectionRuns)
      .orderBy(desc(inSelectionRuns.createdAt))
      .limit(options?.limit ?? 20)
      .offset(options?.offset ?? 0);
    return rows.map((r) => this.toEntity(r));
  }

  private toEntity(row: typeof inSelectionRuns.$inferSelect): SelectionRun {
    const data: SelectionRunData = {
      id: row.id as UUID,
      state: row.state as SelectionRunState,
      constraints: row.constraints as SelectionConstraints,
      selectedCount: row.selectedCount,
      totalPoolSize: row.totalPoolSize,
      coverageImprovement: row.coverageImprovement,
      triggeredBy: row.triggeredBy,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      error: row.error,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    return new SelectionRun(data);
  }
}
