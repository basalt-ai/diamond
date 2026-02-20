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
    const sendOptions: Record<string, unknown> = {};
    if (options?.retryLimit != null)
      sendOptions.retryLimit = options.retryLimit;
    if (options?.retryDelay != null)
      sendOptions.retryDelay = options.retryDelay;
    if (options?.retryBackoff != null)
      sendOptions.retryBackoff = options.retryBackoff;
    if (options?.expireInSeconds != null)
      sendOptions.expireInSeconds = options.expireInSeconds;
    if (options?.priority != null) sendOptions.priority = options.priority;
    if (options?.singletonKey != null)
      sendOptions.singletonKey = options.singletonKey;
    if (options?.startAfterSeconds != null)
      sendOptions.startAfter = options.startAfterSeconds;
    return this.boss.send(name, data as object, sendOptions);
  }

  async work<TData>(
    name: string,
    handler: JobHandler<TData>,
    options?: WorkerOptions
  ): Promise<void> {
    const workOptions: Record<string, unknown> = {
      batchSize: options?.batchSize ?? 1,
    };
    if (options?.pollingIntervalSeconds != null) {
      workOptions.pollingIntervalSeconds = options.pollingIntervalSeconds;
    }
    await this.boss.work<TData>(
      name,
      workOptions,
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
