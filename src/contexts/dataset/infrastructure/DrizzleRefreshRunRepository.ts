import { count, desc, eq } from "drizzle-orm";

import type { Database } from "@/db";
import { dsRefreshRuns } from "@/db/schema/dataset";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import type {
  CreateRefreshRunParams,
  ListRefreshRunsResult,
  RefreshRunRepository,
} from "../application/ports/RefreshRunRepository";
import type {
  RefreshRunData,
  RefreshRunStatus,
} from "../domain/entities/RefreshRun";

export class DrizzleRefreshRunRepository implements RefreshRunRepository {
  constructor(private readonly db: Database) {}

  async create(params: CreateRefreshRunParams): Promise<RefreshRunData> {
    const id = generateId();
    const [row] = await this.db
      .insert(dsRefreshRuns)
      .values({
        id,
        suiteId: params.suiteId,
        triggeredBy: params.triggeredBy,
        triggerEventId: params.triggerEventId,
        scenarioChanges: params.scenarioChanges,
      })
      .returning();
    return row as unknown as RefreshRunData;
  }

  async findById(id: UUID): Promise<RefreshRunData | null> {
    const [row] = await this.db
      .select()
      .from(dsRefreshRuns)
      .where(eq(dsRefreshRuns.id, id));
    return (row as unknown as RefreshRunData) ?? null;
  }

  async listBySuite(
    suiteId: UUID,
    page: number,
    pageSize: number
  ): Promise<ListRefreshRunsResult> {
    const [totalResult] = await this.db
      .select({ value: count() })
      .from(dsRefreshRuns)
      .where(eq(dsRefreshRuns.suiteId, suiteId));
    const total = totalResult?.value ?? 0;

    const offset = (page - 1) * pageSize;
    const rows = await this.db
      .select()
      .from(dsRefreshRuns)
      .where(eq(dsRefreshRuns.suiteId, suiteId))
      .orderBy(desc(dsRefreshRuns.startedAt))
      .limit(pageSize)
      .offset(offset);

    return { data: rows as unknown as RefreshRunData[], total };
  }

  async updateStatus(
    id: UUID,
    status: RefreshRunStatus,
    updates?: {
      candidateCount?: number;
      datasetVersionId?: UUID;
      completedAt?: Date;
    }
  ): Promise<RefreshRunData> {
    const [row] = await this.db
      .update(dsRefreshRuns)
      .set({
        status,
        ...(updates?.candidateCount !== undefined && {
          candidateCount: updates.candidateCount,
        }),
        ...(updates?.datasetVersionId !== undefined && {
          datasetVersionId: updates.datasetVersionId,
        }),
        ...(updates?.completedAt !== undefined && {
          completedAt: updates.completedAt,
        }),
      })
      .where(eq(dsRefreshRuns.id, id))
      .returning();
    return row as unknown as RefreshRunData;
  }
}
