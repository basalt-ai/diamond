export interface JobOptions {
  retryLimit?: number;
  retryDelay?: number;
  retryBackoff?: boolean;
  expireInSeconds?: number;
  priority?: number;
  singletonKey?: string;
  startAfterSeconds?: number;
}

export interface JobHandler<TData = unknown> {
  (job: { id: string; data: TData }): Promise<void>;
}

export interface WorkerOptions {
  batchSize?: number;
  pollingIntervalSeconds?: number;
}

export interface JobQueue {
  send<TData>(
    name: string,
    data: TData,
    options?: JobOptions
  ): Promise<string | null>;
  work<TData>(
    name: string,
    handler: JobHandler<TData>,
    options?: WorkerOptions
  ): Promise<void>;
  schedule(name: string, cron: string, data?: unknown): Promise<void>;
  getQueueSize(name: string): Promise<number>;
  stop(): Promise<void>;
}
