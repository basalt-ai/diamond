import { PgBoss } from "pg-boss";

import type {
  JobHandler,
  JobOptions,
  JobQueue,
  WorkerOptions,
} from "./JobQueue";

export class PgBossJobQueue implements JobQueue {
  constructor(private readonly boss: PgBoss) {}

  async send<TData>(
    name: string,
    data: TData,
    options?: JobOptions
  ): Promise<string | null> {
    return this.boss.send(name, data as object, {
      retryLimit: options?.retryLimit,
      retryDelay: options?.retryDelay,
      retryBackoff: options?.retryBackoff,
      expireInSeconds: options?.expireInSeconds,
      priority: options?.priority,
      singletonKey: options?.singletonKey,
      startAfter: options?.startAfterSeconds,
    });
  }

  async work<TData>(
    name: string,
    handler: JobHandler<TData>,
    options?: WorkerOptions
  ): Promise<void> {
    await this.boss.work<TData>(
      name,
      {
        batchSize: options?.batchSize ?? 1,
        pollingIntervalSeconds: options?.pollingIntervalSeconds,
      },
      async (jobs) => {
        for (const job of jobs) {
          await handler({ id: job.id, data: job.data });
        }
      }
    );
  }

  async schedule(name: string, cron: string, data?: unknown): Promise<void> {
    await this.boss.schedule(name, cron, data as object);
  }

  async getQueueSize(name: string): Promise<number> {
    const queues = await this.boss.getQueues([name]);
    const queue = queues[0];
    return queue ? (queue.totalCount ?? 0) : 0;
  }

  async stop(): Promise<void> {
    await this.boss.stop({ graceful: true, timeout: 30_000 });
  }
}
