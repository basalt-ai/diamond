import { inArray } from "drizzle-orm";

import type { Database } from "@/db";
import { inEmbeddings } from "@/db/schema/intelligence";
import { eventBus } from "@/lib/events/InProcessEventBus";
import type { UUID } from "@/shared/types";

import type { ClusterData } from "../../domain/entities/ClusteringRun";
import { ClusteringRunNotFoundError } from "../../domain/errors";
import type { CandidateMapper } from "../ports/CandidateMapper";
import type { ClusteringRunRepository } from "../ports/ClusteringRunRepository";
import type { ScenarioMapper } from "../ports/ScenarioMapper";
import type { ScenarioTypeCreator } from "../ports/ScenarioTypeCreator";

export interface InductionResult {
  inducedScenarioCount: number;
  reusedScenarioCount: number;
  mappedCandidateCount: number;
  scenarioTypeIds: UUID[];
}

export class InduceScenarios {
  constructor(
    private readonly db: Database,
    private readonly clusteringRunRepo: ClusteringRunRepository,
    private readonly scenarioTypeCreator: ScenarioTypeCreator,
    private readonly candidateMapper: CandidateMapper,
    private readonly scenarioMapper: ScenarioMapper
  ) {}

  async execute(clusteringRunId: UUID): Promise<InductionResult> {
    const run = await this.clusteringRunRepo.findById(clusteringRunId);
    if (!run) throw new ClusteringRunNotFoundError(clusteringRunId);

    if (run.state !== "completed") {
      throw new Error(
        `Cannot induce from run in state "${run.state}" — must be "completed"`
      );
    }

    const scenarioTypeIds: UUID[] = [];
    let totalMappedCandidates = 0;
    let reusedCount = 0;

    for (const cluster of run.clusters) {
      // Skip clusters that already have an induced scenario
      if (cluster.inducedScenarioTypeId) {
        scenarioTypeIds.push(cluster.inducedScenarioTypeId);
        continue;
      }

      // Try to match this cluster to an existing scenario via centroid similarity
      const existingMatch = await this.findExistingScenario(cluster);

      let scenarioTypeId: UUID;

      if (existingMatch) {
        // Reuse existing scenario — no duplicate
        scenarioTypeId = existingMatch.scenarioTypeId;
        reusedCount++;
      } else {
        // No match — create new scenario type
        const riskCategory = cluster.suggestedRiskCategory ?? "business";
        const riskTier =
          await this.scenarioTypeCreator.findOrCreateRiskTier(riskCategory);

        // Resolve/create failure modes
        const failureModeIds: UUID[] = [];
        for (const fm of cluster.suggestedFailureModes) {
          const result =
            await this.scenarioTypeCreator.findOrCreateFailureMode(fm);
          failureModeIds.push(result.id);
        }

        // Resolve/create context profile
        const contextProfileIds: UUID[] = [];
        if (cluster.suggestedContextProfile) {
          const result =
            await this.scenarioTypeCreator.findOrCreateContextProfile(
              cluster.suggestedContextProfile
            );
          contextProfileIds.push(result.id);
        }

        const scenarioType = await this.scenarioTypeCreator.create({
          name: cluster.suggestedName ?? `Cluster ${cluster.label}`,
          description:
            cluster.suggestedDescription ??
            `Auto-induced from cluster ${cluster.label}`,
          riskTierId: riskTier.id,
          needsReview: true,
          failureModeIds,
          contextProfileIds,
        });
        scenarioTypeId = scenarioType.id;
      }

      scenarioTypeIds.push(scenarioTypeId);

      // Link cluster to scenario type
      await this.clusteringRunRepo.updateClusterScenarioTypeId(
        cluster.id,
        scenarioTypeId
      );

      // Map cluster member candidates to scenario type
      if (cluster.candidateIds.length > 0) {
        await this.candidateMapper.mapToScenario(
          cluster.candidateIds,
          scenarioTypeId,
          existingMatch ? existingMatch.confidence : 0.8
        );
        totalMappedCandidates += cluster.candidateIds.length;
      }
    }

    // Recompute centroids now that candidates are mapped
    await this.scenarioMapper.updateCentroids();

    await eventBus.publish({
      eventId: crypto.randomUUID(),
      eventType: "scenario_induction.completed",
      aggregateId: clusteringRunId,
      occurredAt: new Date(),
      payload: {
        clustering_run_id: clusteringRunId,
        induced_scenario_count: scenarioTypeIds.length,
        reused_scenario_count: reusedCount,
        mapped_candidate_count: totalMappedCandidates,
      },
    });

    return {
      inducedScenarioCount: scenarioTypeIds.length - reusedCount,
      reusedScenarioCount: reusedCount,
      mappedCandidateCount: totalMappedCandidates,
      scenarioTypeIds,
    };
  }

  /**
   * Compute the average embedding of a cluster's candidates and check
   * if it matches an existing scenario type's centroid.
   */
  private async findExistingScenario(
    cluster: ClusterData
  ): Promise<{ scenarioTypeId: UUID; confidence: number } | null> {
    if (cluster.candidateIds.length === 0) return null;

    // Get embeddings for cluster members (sample up to 50 for efficiency)
    const sampleIds = cluster.candidateIds.slice(0, 50);
    const rows = await this.db
      .select({ embedding: inEmbeddings.embedding })
      .from(inEmbeddings)
      .where(inArray(inEmbeddings.candidateId, sampleIds));

    if (rows.length === 0) return null;

    // Compute average embedding (centroid)
    const dim = 1536;
    const avg = new Array<number>(dim).fill(0);
    for (const row of rows) {
      const emb = row.embedding as unknown as number[];
      for (let i = 0; i < dim; i++) {
        avg[i]! += emb[i]! / rows.length;
      }
    }

    // Check against existing scenario centroids
    return this.scenarioMapper.map("" as UUID, avg);
  }
}
