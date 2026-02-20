import type { z } from "zod";

import { sanitizeError } from "@/lib/api/sanitize";

export interface Job<TData = unknown> {
  id: string;
  data: TData;
}

export function withJobValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (data: T, jobId: string) => Promise<void>
): (job: Job<unknown>) => Promise<void> {
  return async (job) => {
    let data: T;
    try {
      data = schema.parse(job.data);
    } catch (error) {
      throw new Error(
        `Job ${job.id} payload validation failed: ${sanitizeError(error)}`
      );
    }
    await handler(data, job.id);
  };
}
