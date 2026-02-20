import { and, count, eq, sql } from "drizzle-orm";

import type { Database } from "@/db";
import { dsEvalResults, dsEvalRuns } from "@/db/schema/dataset";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import type {
  CreateEvalRunParams,
  EvalResultRow,
  EvalRunRepository,
  EvalRunWithStats,
} from "../application/ports/EvalRunRepository";
import type { EvalRunData } from "../domain/entities/EvalRun";

const CHUNK_SIZE = 1_000;

export class DrizzleEvalRunRepository implements EvalRunRepository {
  constructor(private readonly db: Database) {}

  async createWithResults(params: CreateEvalRunParams): Promise<EvalRunData> {
    const runId = generateId();

    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(dsEvalRuns)
        .values({
          id: runId,
          datasetVersionId: params.datasetVersionId,
          modelName: params.modelName,
          modelVersion: params.modelVersion,
          evalRunExternalId: params.evalRunExternalId,
          metadata: params.metadata,
        })
        .returning();

      for (let i = 0; i < params.results.length; i += CHUNK_SIZE) {
        const chunk = params.results.slice(i, i + CHUNK_SIZE);
        await tx.insert(dsEvalResults).values(
          chunk.map((r) => ({
            id: generateId(),
            evalRunId: runId,
            candidateId: r.candidateId,
            passed: r.passed,
            score: r.score,
            judgeOutput: r.judgeOutput,
            failureMode: r.failureMode,
          }))
        );
      }

      return this.toRunData(row!);
    });
  }

  async findById(id: UUID): Promise<EvalRunData | null> {
    const [row] = await this.db
      .select()
      .from(dsEvalRuns)
      .where(eq(dsEvalRuns.id, id));
    return row ? this.toRunData(row) : null;
  }

  async findByExternalId(
    datasetVersionId: UUID,
    modelName: string,
    modelVersion: string,
    externalId: string
  ): Promise<EvalRunData | null> {
    const [row] = await this.db
      .select()
      .from(dsEvalRuns)
      .where(
        and(
          eq(dsEvalRuns.datasetVersionId, datasetVersionId),
          eq(dsEvalRuns.modelName, modelName),
          eq(dsEvalRuns.modelVersion, modelVersion),
          eq(dsEvalRuns.evalRunExternalId, externalId)
        )
      );
    return row ? this.toRunData(row) : null;
  }

  async list(
    filter: {
      datasetVersionId?: UUID;
      modelName?: string;
      modelVersion?: string;
    },
    page: number,
    pageSize: number
  ): Promise<{ data: EvalRunWithStats[]; total: number }> {
    const conditions = [];
    if (filter.datasetVersionId)
      conditions.push(eq(dsEvalRuns.datasetVersionId, filter.datasetVersionId));
    if (filter.modelName)
      conditions.push(eq(dsEvalRuns.modelName, filter.modelName));
    if (filter.modelVersion)
      conditions.push(eq(dsEvalRuns.modelVersion, filter.modelVersion));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await this.db
      .select({ value: count() })
      .from(dsEvalRuns)
      .where(where);
    const total = countResult?.value ?? 0;

    const runs = await this.db
      .select()
      .from(dsEvalRuns)
      .where(where)
      .orderBy(sql`${dsEvalRuns.createdAt} DESC`)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const data: EvalRunWithStats[] = [];
    for (const run of runs) {
      const [stats] = await this.db
        .select({
          total: count(),
          passed: sql<number>`SUM(CASE WHEN ${dsEvalResults.passed} THEN 1 ELSE 0 END)`,
        })
        .from(dsEvalResults)
        .where(eq(dsEvalResults.evalRunId, run.id));

      const totalResults = stats?.total ?? 0;
      const passedCount = Number(stats?.passed ?? 0);

      data.push({
        ...this.toRunData(run),
        totalResults,
        passedCount,
        passRate: totalResults > 0 ? passedCount / totalResults : 0,
      });
    }

    return { data, total };
  }

  async getResultsByRunId(
    runId: UUID,
    page: number,
    pageSize: number
  ): Promise<{ data: EvalResultRow[]; total: number }> {
    const [countResult] = await this.db
      .select({ value: count() })
      .from(dsEvalResults)
      .where(eq(dsEvalResults.evalRunId, runId));
    const total = countResult?.value ?? 0;

    const rows = await this.db
      .select()
      .from(dsEvalResults)
      .where(eq(dsEvalResults.evalRunId, runId))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return { data: rows.map((r) => this.toResultRow(r)), total };
  }

  async getResultsByVersionId(versionId: UUID): Promise<EvalResultRow[]> {
    const rows = await this.db
      .select({
        id: dsEvalResults.id,
        evalRunId: dsEvalResults.evalRunId,
        candidateId: dsEvalResults.candidateId,
        passed: dsEvalResults.passed,
        score: dsEvalResults.score,
        judgeOutput: dsEvalResults.judgeOutput,
        failureMode: dsEvalResults.failureMode,
      })
      .from(dsEvalResults)
      .innerJoin(dsEvalRuns, eq(dsEvalResults.evalRunId, dsEvalRuns.id))
      .where(eq(dsEvalRuns.datasetVersionId, versionId));

    return rows.map((r) => this.toResultRow(r));
  }

  private toRunData(row: typeof dsEvalRuns.$inferSelect): EvalRunData {
    return {
      id: row.id as UUID,
      datasetVersionId: row.datasetVersionId as UUID,
      modelName: row.modelName,
      modelVersion: row.modelVersion,
      evalRunExternalId: row.evalRunExternalId,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      createdAt: row.createdAt,
    };
  }

  private toResultRow(row: typeof dsEvalResults.$inferSelect): EvalResultRow {
    return {
      id: row.id as UUID,
      evalRunId: row.evalRunId as UUID,
      candidateId: row.candidateId as UUID,
      passed: row.passed,
      score: row.score,
      judgeOutput: row.judgeOutput as Record<string, unknown> | null,
      failureMode: row.failureMode,
    };
  }
}
