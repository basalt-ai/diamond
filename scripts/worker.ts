import http from "node:http";

import { eq, isNull, sql } from "drizzle-orm";
import { PgBoss } from "pg-boss";

import type { DatasetReader } from "../src/contexts/intelligence/application/ports/DatasetReader";
import type { ScenarioReader } from "../src/contexts/intelligence/application/ports/ScenarioReader";
import { ManageEmbeddings } from "../src/contexts/intelligence/application/use-cases/ManageEmbeddings";
import { CandidateContextAdapter } from "../src/contexts/intelligence/infrastructure/CandidateContextAdapter";
import { CompositeScoringEngine } from "../src/contexts/intelligence/infrastructure/CompositeScoringEngine";
import { DrizzleEmbeddingRepository } from "../src/contexts/intelligence/infrastructure/DrizzleEmbeddingRepository";
import { EmbeddingScenarioMapper } from "../src/contexts/intelligence/infrastructure/EmbeddingScenarioMapper";
import { EpisodeFeatureExtractor } from "../src/contexts/intelligence/infrastructure/EpisodeFeatureExtractor";
import { IngestionContextAdapter } from "../src/contexts/intelligence/infrastructure/IngestionContextAdapter";
import { OpenAIEmbeddingProvider } from "../src/contexts/intelligence/infrastructure/OpenAIEmbeddingProvider";
import { PgVectorRedundancyOracle } from "../src/contexts/intelligence/infrastructure/PgVectorRedundancyOracle";
import { CoverageGainScorer } from "../src/contexts/intelligence/infrastructure/scorers/CoverageGainScorer";
import { FailureProbabilityScorer } from "../src/contexts/intelligence/infrastructure/scorers/FailureProbabilityScorer";
import { NoveltyScorer } from "../src/contexts/intelligence/infrastructure/scorers/NoveltyScorer";
import { RedundancyPenaltyScorer } from "../src/contexts/intelligence/infrastructure/scorers/RedundancyPenaltyScorer";
import { RiskWeightScorer } from "../src/contexts/intelligence/infrastructure/scorers/RiskWeightScorer";
import { db } from "../src/db";
import { cdCandidates } from "../src/db/schema/candidate";
import { sanitizeError } from "../src/lib/api/sanitize";
import { PgBossJobQueue } from "../src/lib/jobs/PgBossJobQueue";
import { QUEUES } from "../src/lib/jobs/queues";
import { JobPayloads } from "../src/lib/jobs/registry";
import { withJobValidation } from "../src/lib/jobs/validation";
import type { UUID } from "../src/shared/types";

const connectionString =
  process.env.PGBOSS_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const boss = new PgBoss({
  connectionString,
  schema: "pgboss",
  application_name: "diamond-worker",
  max: 5,
});

boss.on("error", console.error);

// ── Adapters ────────────────────────────────────────────────────

const embeddingRepo = new DrizzleEmbeddingRepository(db);
const embeddingProvider = new OpenAIEmbeddingProvider();
const episodeReader = new IngestionContextAdapter(db);
const candidateReader = new CandidateContextAdapter(db);
const redundancyOracle = new PgVectorRedundancyOracle(db);
const featureExtractor = new EpisodeFeatureExtractor();
const scenarioMapper = new EmbeddingScenarioMapper(db);
const manageEmbeddings = new ManageEmbeddings(
  embeddingRepo,
  embeddingProvider,
  episodeReader
);

// Stub readers for scorers — return empty data until fully wired
const scenarioReader: ScenarioReader = {
  async findAllTypes() {
    return [];
  },
  async findTypeById() {
    return null;
  },
};
const datasetReader: DatasetReader = {
  async findCandidateIdsInCurrentDataset() {
    return [];
  },
  async findCandidateSnapshotsInCurrentDataset() {
    return [];
  },
};

const scoringEngine = new CompositeScoringEngine([
  new CoverageGainScorer(scenarioReader, datasetReader),
  new RiskWeightScorer(scenarioReader),
  new NoveltyScorer(redundancyOracle),
  new FailureProbabilityScorer(),
  new RedundancyPenaltyScorer(redundancyOracle),
]);

// ── Queue creation ──────────────────────────────────────────────

async function createQueues(): Promise<void> {
  await boss.createQueue(QUEUES.EMBEDDING_DLQ);
  await boss.createQueue(QUEUES.EMBEDDING_COMPUTE, {
    retryLimit: 3,
    retryDelay: 30,
    retryBackoff: true,
    expireInSeconds: 300,
    deadLetter: QUEUES.EMBEDDING_DLQ,
  });

  await boss.createQueue(QUEUES.SCORING_DLQ);
  await boss.createQueue(QUEUES.SCORING_COMPUTE, {
    retryLimit: 3,
    retryDelay: 30,
    retryBackoff: true,
    expireInSeconds: 600,
    deadLetter: QUEUES.SCORING_DLQ,
  });

  await boss.createQueue(QUEUES.SCORING_RUN, {
    retryLimit: 2,
    retryDelay: 60,
    retryBackoff: true,
    expireInSeconds: 3600,
  });

  await boss.createQueue(QUEUES.SELECTION_RUN, {
    retryLimit: 2,
    retryDelay: 60,
    retryBackoff: true,
    expireInSeconds: 3600,
  });

  await boss.createQueue(QUEUES.CLUSTER_DETECT, {
    retryLimit: 1,
    expireInSeconds: 600,
  });

  await boss.createQueue(QUEUES.LABELING_CREATE, {
    retryLimit: 3,
    retryDelay: 10,
    expireInSeconds: 120,
  });
}

// ── Handler registration ────────────────────────────────────────

async function registerHandlers(queue: PgBossJobQueue): Promise<void> {
  // embedding.compute: embed a candidate and then enqueue scoring
  await queue.work(
    QUEUES.EMBEDDING_COMPUTE,
    withJobValidation(JobPayloads["embedding.compute"], async (data, jobId) => {
      const candidateId = data.candidateId as UUID;
      console.log(`[worker] embedding.compute ${candidateId} (job ${jobId})`);

      const candidate = await candidateReader.findById(candidateId);
      if (!candidate) {
        console.warn(`[worker] Candidate ${candidateId} not found, skipping`);
        return;
      }

      try {
        await manageEmbeddings.embedCandidate(candidateId, candidate.episodeId);

        // Mark candidate as embedded
        await db
          .update(cdCandidates)
          .set({ embeddedAt: new Date(), updatedAt: new Date() })
          .where(eq(cdCandidates.id, candidateId));

        console.log(`[worker] Embedded ${candidateId}, enqueueing scoring`);

        // Chain: enqueue scoring job
        await boss.send(QUEUES.SCORING_COMPUTE, {
          candidateId,
          runId: "auto",
        });
      } catch (error) {
        console.error(
          `[worker] embedding.compute failed for ${candidateId}:`,
          sanitizeError(error)
        );
        throw error; // let pg-boss retry
      }
    })
  );

  // scoring.compute: score a single candidate
  await queue.work(
    QUEUES.SCORING_COMPUTE,
    withJobValidation(JobPayloads["scoring.compute"], async (data, jobId) => {
      const candidateId = data.candidateId as UUID;
      console.log(`[worker] scoring.compute ${candidateId} (job ${jobId})`);

      const candidate = await candidateReader.findById(candidateId);
      if (!candidate) {
        console.warn(`[worker] Candidate ${candidateId} not found, skipping`);
        return;
      }

      const episode = await episodeReader.findById(candidate.episodeId);
      if (!episode) {
        console.warn(
          `[worker] Episode ${candidate.episodeId} not found, skipping`
        );
        return;
      }

      const embedding = await embeddingRepo.findByCandidateId(candidateId);
      if (!embedding) {
        console.warn(
          `[worker] Embedding not found for ${candidateId}, skipping`
        );
        return;
      }

      try {
        // Auto-map scenario if unmapped
        let scenarioTypeId = candidate.scenarioTypeId;
        let mappingConfidence = candidate.scenarioTypeId ? 1.0 : 0;

        if (!scenarioTypeId) {
          const mapping = await scenarioMapper.map(
            candidateId,
            embedding.embedding
          );
          if (mapping) {
            scenarioTypeId = mapping.scenarioTypeId;
            mappingConfidence = mapping.confidence;
          }
        }

        const features = featureExtractor.extract(episode);

        const scores = await scoringEngine.score({
          candidateId,
          episodeId: candidate.episodeId,
          features,
          embedding: embedding.embedding,
          scenarioTypeId,
          mappingConfidence,
        });

        // Update candidate with scores, features, mapping, and transition to scored
        await db
          .update(cdCandidates)
          .set({
            scores,
            features,
            scenarioTypeId,
            mappingConfidence,
            scoringDirty: false,
            state: "scored",
            updatedAt: new Date(),
          })
          .where(eq(cdCandidates.id, candidateId));

        console.log(
          `[worker] Scored ${candidateId}: ${JSON.stringify(scores)}`
        );

        // Debounced clustering: enqueue with singleton key + 30s delay
        // pg-boss deduplicates — only one cluster.detect runs at a time
        await boss.send(
          QUEUES.CLUSTER_DETECT,
          { minClusterSize: 5 },
          {
            singletonKey: "auto-cluster",
            startAfter: 30, // seconds — debounce window
          }
        );
      } catch (error) {
        console.error(
          `[worker] scoring.compute failed for ${candidateId}:`,
          sanitizeError(error)
        );
        throw error;
      }
    })
  );

  // cluster.detect: run HDBSCAN on unmapped candidates, then auto-induce scenarios
  await queue.work(
    QUEUES.CLUSTER_DETECT,
    withJobValidation(JobPayloads["cluster.detect"], async (data, jobId) => {
      console.log(`[worker] cluster.detect (job ${jobId})`);

      // Check unmapped candidate count
      const rows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(cdCandidates)
        .where(isNull(cdCandidates.scenarioTypeId));
      const count = rows[0]?.count ?? 0;

      const MIN_UNMAPPED = 15;
      if (count < MIN_UNMAPPED) {
        console.log(
          `[worker] Only ${count} unmapped candidates (need ${MIN_UNMAPPED}), skipping clustering`
        );
        return;
      }

      try {
        const { manageClusteringRuns } =
          await import("../src/contexts/intelligence");
        const result = await manageClusteringRuns.create({
          minClusterSize: data.minClusterSize ?? 5,
          triggeredBy: "worker:auto",
        });

        console.log(
          `[worker] Clustering run ${result.id}: ${result.clusterCount} clusters, ${result.noiseCount} noise, state=${result.state}`
        );

        // Induction is auto-triggered by clustering_run.completed event handler
      } catch (error) {
        console.error(`[worker] cluster.detect failed:`, sanitizeError(error));
        throw error;
      }
    })
  );

  console.log(
    "[worker] Handlers registered: embedding.compute, scoring.compute, cluster.detect"
  );
}

// ── Health endpoint ─────────────────────────────────────────────

const healthServer = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", queues: Object.values(QUEUES) }));
});

// ── Main ────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("[worker] Starting pg-boss...");
  await boss.start();

  console.log("[worker] Creating queues...");
  await createQueues();

  const queue = new PgBossJobQueue(boss);
  await registerHandlers(queue);

  const healthPort = Number(process.env.WORKER_HEALTH_PORT ?? 9090);
  healthServer.listen(healthPort, () => {
    console.log(`[worker] Health endpoint at :${healthPort}/health`);
  });

  console.log("[worker] Ready and processing jobs");
}

async function shutdown(): Promise<void> {
  console.log("[worker] Shutting down gracefully...");
  healthServer.close();
  await boss.stop({ graceful: true, timeout: 30_000 });
  console.log("[worker] Stopped");
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

main().catch((err) => {
  console.error("[worker] Fatal:", err);
  process.exit(1);
});
