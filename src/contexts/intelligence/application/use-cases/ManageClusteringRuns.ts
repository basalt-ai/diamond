import { sanitizeError } from "@/lib/api/sanitize";
import { eventBus } from "@/lib/events/InProcessEventBus";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import {
  ClusteringRun,
  type ClusterData,
  type ClusteringRunData,
  type ClusteringRunParams,
} from "../../domain/entities/ClusteringRun";
import { ClusteringRunNotFoundError } from "../../domain/errors";
import type { HdbscanClusterDetector } from "../../infrastructure/HdbscanClusterDetector";
import type { ClusteringRunRepository } from "../ports/ClusteringRunRepository";
import type { ClusterSummarizer } from "../ports/ClusterSummarizer";

export interface CreateClusteringRunInput {
  minClusterSize?: number;
  triggeredBy?: string | null;
}

export class ManageClusteringRuns {
  constructor(
    private readonly repo: ClusteringRunRepository,
    private readonly detector: HdbscanClusterDetector,
    private readonly summarizer: ClusterSummarizer | null
  ) {}

  async create(
    input: CreateClusteringRunInput = {}
  ): Promise<ClusteringRunData> {
    const minClusterSize = input.minClusterSize ?? 5;
    const params: ClusteringRunParams = {
      minClusterSize,
      minSamples: 3,
      algorithm: "hdbscan",
    };

    const run = new ClusteringRun({
      id: generateId() as UUID,
      state: "pending",
      params,
      totalCandidates: 0,
      clusterCount: 0,
      noiseCount: 0,
      errorMessage: null,
      triggeredBy: input.triggeredBy ?? null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      clusters: [],
    });

    run.transitionTo("running");
    await this.repo.save(run);

    try {
      const result = await this.detector.detect(minClusterSize);

      const clusters: ClusterData[] = [];
      for (const c of result.clusters) {
        const cluster: ClusterData = {
          id: generateId() as UUID,
          label: c.cluster_id,
          size: c.size,
          candidateIds: c.candidate_ids as UUID[],
          representativeCandidateIds: c.representative_ids as UUID[],
          suggestedName: null,
          suggestedDescription: null,
          inducedScenarioTypeId: null,
          centroid: null,
        };

        // Auto-name via LLM if summarizer is available
        if (this.summarizer && c.representative_ids.length > 0) {
          try {
            const summary = await this.summarizer.summarize(
              c.representative_ids as UUID[]
            );
            cluster.suggestedName = summary.suggestedName;
            cluster.suggestedDescription = summary.suggestedDescription;
          } catch {
            // Fallback naming
            cluster.suggestedName = `Cluster ${c.cluster_id}`;
            cluster.suggestedDescription = `Auto-detected cluster of ${c.size} episodes`;
          }
        } else {
          cluster.suggestedName = `Cluster ${c.cluster_id}`;
          cluster.suggestedDescription = `Auto-detected cluster of ${c.size} episodes`;
        }

        clusters.push(cluster);
      }

      run.complete(clusters, result.total, result.noise_count);
      await this.repo.save(run);
      await eventBus.publishAll(run.domainEvents);
      return run.toData();
    } catch (err) {
      run.fail(sanitizeError(err));
      await this.repo.save(run);
      await eventBus.publishAll(run.domainEvents);
      return run.toData();
    }
  }

  async get(id: UUID): Promise<ClusteringRunData> {
    const run = await this.repo.findById(id);
    if (!run) throw new ClusteringRunNotFoundError(id);
    return run.toData();
  }

  async list(options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ runs: ClusteringRunData[]; total: number }> {
    const [runs, total] = await Promise.all([
      this.repo.list(options),
      this.repo.count(),
    ]);
    return {
      runs: runs.map((r) => r.toData()),
      total,
    };
  }
}
