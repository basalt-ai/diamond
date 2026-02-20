import { PgBoss } from "pg-boss";

import type { JobQueue } from "./JobQueue";
import { PgBossJobQueue } from "./PgBossJobQueue";

let _boss: PgBoss | null = null;
let _queue: JobQueue | null = null;

/**
 * Send-only job client for use in Next.js API routes.
 * Does NOT supervise or process jobs — only enqueues.
 */
export async function getJobClient(): Promise<JobQueue> {
  if (!_queue) {
    _boss = new PgBoss({
      connectionString:
        process.env.PGBOSS_DATABASE_URL ?? process.env.DATABASE_URL!,
      schema: "pgboss",
      application_name: "diamond-api",
      supervise: false,
      schedule: false,
      migrate: false,
      max: 3,
    });
    _boss.on("error", console.error);
    await _boss.start();
    _queue = new PgBossJobQueue(_boss);
  }
  return _queue;
}
