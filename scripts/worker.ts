import http from "node:http";

import { PgBoss } from "pg-boss";

import { PgBossJobQueue } from "../src/lib/jobs/PgBossJobQueue";
import { QUEUES } from "../src/lib/jobs/queues";

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

async function registerHandlers(_queue: PgBossJobQueue): Promise<void> {
  // Handlers will be registered as each pipeline component is built.
  // For now, this is a placeholder showing the pattern:
  //
  // await queue.work("embedding.compute", withJobValidation(
  //   JobPayloads["embedding.compute"],
  //   async (data) => { /* handler */ }
  // ));
  console.log(
    "[worker] No handlers registered yet — add them as pipeline components are built"
  );
}

// Health endpoint
const healthServer = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", queues: Object.values(QUEUES) }));
});

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
