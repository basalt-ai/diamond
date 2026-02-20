import { desc, eq } from "drizzle-orm";

import type { Database } from "@/db";
import { inClusteringRuns, inClusters } from "@/db/schema/intelligence";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import type { ClusteringRunRepository } from "../application/ports/ClusteringRunRepository";
import {
  ClusteringRun,
  type ClusterData,
  type ClusteringRunData,
  type ClusteringRunParams,
  type ClusteringRunState,
} from "../domain/entities/ClusteringRun";

export class DrizzleClusteringRunRepository implements ClusteringRunRepository {
  constructor(private readonly db: Database) {}

  async save(run: ClusteringRun): Promise<void> {
    const data = run.toData();

    await this.db.transaction(async (tx) => {
      await tx
        .insert(inClusteringRuns)
        .values({
          id: data.id,
          state: data.state,
          params: data.params,
          totalCandidates: data.totalCandidates,
          clusterCount: data.clusterCount,
          noiseCount: data.noiseCount,
          errorMessage: data.errorMessage,
          triggeredBy: data.triggeredBy,
          startedAt: data.startedAt,
          completedAt: data.completedAt,
        })
        .onConflictDoUpdate({
          target: inClusteringRuns.id,
          set: {
            state: data.state,
            params: data.params,
            totalCandidates: data.totalCandidates,
            clusterCount: data.clusterCount,
            noiseCount: data.noiseCount,
            errorMessage: data.errorMessage,
            startedAt: data.startedAt,
            completedAt: data.completedAt,
            updatedAt: new Date(),
          },
        });

      if (data.clusters.length > 0) {
        // Delete existing clusters for this run, then re-insert
        await tx
          .delete(inClusters)
          .where(eq(inClusters.clusteringRunId, data.id));

        await tx.insert(inClusters).values(
          data.clusters.map((c) => ({
            id: c.id || (generateId() as UUID),
            clusteringRunId: data.id,
            label: c.label,
            size: c.size,
            candidateIds: c.candidateIds,
            representativeCandidateIds: c.representativeCandidateIds,
            suggestedName: c.suggestedName,
            suggestedDescription: c.suggestedDescription,
            inducedScenarioTypeId: c.inducedScenarioTypeId,
            centroid: c.centroid,
          }))
        );
      }
    });
  }

  async findById(id: UUID): Promise<ClusteringRun | null> {
    const [row] = await this.db
      .select()
      .from(inClusteringRuns)
      .where(eq(inClusteringRuns.id, id));
    if (!row) return null;

    const clusterRows = await this.db
      .select()
      .from(inClusters)
      .where(eq(inClusters.clusteringRunId, id));

    return this.toEntity(row, clusterRows);
  }

  async list(options?: {
    limit?: number;
    offset?: number;
  }): Promise<ClusteringRun[]> {
    const rows = await this.db
      .select()
      .from(inClusteringRuns)
      .orderBy(desc(inClusteringRuns.createdAt))
      .limit(options?.limit ?? 20)
      .offset(options?.offset ?? 0);

    const results: ClusteringRun[] = [];
    for (const row of rows) {
      const clusterRows = await this.db
        .select()
        .from(inClusters)
        .where(eq(inClusters.clusteringRunId, row.id));
      results.push(this.toEntity(row, clusterRows));
    }
    return results;
  }

  async count(): Promise<number> {
    const rows = await this.db
      .select({ id: inClusteringRuns.id })
      .from(inClusteringRuns);
    return rows.length;
  }

  async updateClusterScenarioTypeId(
    clusterId: UUID,
    scenarioTypeId: UUID
  ): Promise<void> {
    await this.db
      .update(inClusters)
      .set({ inducedScenarioTypeId: scenarioTypeId })
      .where(eq(inClusters.id, clusterId));
  }

  private toEntity(
    row: typeof inClusteringRuns.$inferSelect,
    clusterRows: (typeof inClusters.$inferSelect)[]
  ): ClusteringRun {
    const clusters: ClusterData[] = clusterRows.map((c) => ({
      id: c.id as UUID,
      label: c.label,
      size: c.size,
      candidateIds: (c.candidateIds ?? []) as UUID[],
      representativeCandidateIds: (c.representativeCandidateIds ??
        []) as UUID[],
      suggestedName: c.suggestedName,
      suggestedDescription: c.suggestedDescription,
      inducedScenarioTypeId: c.inducedScenarioTypeId as UUID | null,
      centroid: c.centroid as number[] | null,
    }));

    const data: ClusteringRunData = {
      id: row.id as UUID,
      state: row.state as ClusteringRunState,
      params: (row.params ?? {}) as ClusteringRunParams,
      totalCandidates: row.totalCandidates,
      clusterCount: row.clusterCount,
      noiseCount: row.noiseCount,
      errorMessage: row.errorMessage,
      triggeredBy: row.triggeredBy,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      clusters,
    };
    return new ClusteringRun(data);
  }
}
