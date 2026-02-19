"use client";

import { useCallback, useState, useTransition } from "react";

import { api, ApiClientError } from "@/lib/api-client";

type Method = "POST" | "PUT" | "PATCH" | "DELETE";

interface UseMutationOptions {
  onSuccess?: () => void;
  onError?: (error: ApiClientError) => void;
}

export function useMutation<TResponse = unknown>(
  method: Method,
  path: string,
  options?: UseMutationOptions
) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<ApiClientError | undefined>();

  const mutate = useCallback(
    (body?: unknown) => {
      setError(undefined);
      startTransition(async () => {
        try {
          const fns: Record<
            Method,
            (p: string, b?: unknown) => Promise<TResponse>
          > = {
            POST: api.post,
            PUT: api.put,
            PATCH: api.patch,
            DELETE: (p: string) => api.del<TResponse>(p),
          };
          await fns[method](path, body);
          options?.onSuccess?.();
        } catch (err: unknown) {
          const apiErr =
            err instanceof ApiClientError
              ? err
              : new ApiClientError(0, "UNKNOWN", String(err));
          setError(apiErr);
          options?.onError?.(apiErr);
        }
      });
    },
    [method, path, options]
  );

  return { mutate, isPending, error };
}
