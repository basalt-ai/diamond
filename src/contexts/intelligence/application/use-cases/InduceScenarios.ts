import { eventBus } from "@/lib/events/InProcessEventBus";
import type { UUID } from "@/shared/types";

import { ClusteringRunNotFoundError } from "../../domain/errors";
import type { CandidateMapper } from "../ports/CandidateMapper";
import type { ClusteringRunRepository } from "../ports/ClusteringRunRepository";
import type { ScenarioMapper } from "../ports/ScenarioMapper";
import type { ScenarioTypeCreator } from "../ports/ScenarioTypeCreator";

export interface InductionResult {
  inducedScenarioCount: number;
  mappedCandidateCount: number;
  scenarioTypeIds: UUID[];
}

export class InduceScenarios {
  constructor(
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

    for (const cluster of run.clusters) {
      // Skip clusters that already have an induced scenario
      if (cluster.inducedScenarioTypeId) {
        scenarioTypeIds.push(cluster.inducedScenarioTypeId);
        continue;
      }

      // Determine risk tier from suggested category or fall back to "business"
      const riskTier =
        await this.scenarioTypeCreator.findRiskTierByCategory("business");
      if (!riskTier) {
        throw new Error("No risk tiers found — run db:seed to create defaults");
      }

      // Create scenario type
      const scenarioType = await this.scenarioTypeCreator.create({
        name: cluster.suggestedName ?? `Cluster ${cluster.label}`,
        description:
          cluster.suggestedDescription ??
          `Auto-induced from cluster ${cluster.label}`,
        riskTierId: riskTier.id,
        needsReview: true,
      });

      scenarioTypeIds.push(scenarioType.id);

      // Link cluster to induced scenario type
      await this.clusteringRunRepo.updateClusterScenarioTypeId(
        cluster.id,
        scenarioType.id
      );

      // Map cluster member candidates to new scenario type
      if (cluster.candidateIds.length > 0) {
        await this.candidateMapper.mapToScenario(
          cluster.candidateIds,
          scenarioType.id,
          0.8 // Cluster membership confidence
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
        mapped_candidate_count: totalMappedCandidates,
      },
    });

    return {
      inducedScenarioCount: scenarioTypeIds.length,
      mappedCandidateCount: totalMappedCandidates,
      scenarioTypeIds,
    };
  }
}
