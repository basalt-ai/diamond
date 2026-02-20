"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { api, ApiClientError } from "@/lib/api-client";

interface UseApiState<T> {
  data: T | undefined;
  error: ApiClientError | undefined;
  isLoading: boolean;
  status: number | undefined;
}

interface UseApiOptions {
  /** Polling interval in ms. When set, re-fetches on this interval. */
  pollInterval?: number;
  /** If provided, polling continues only while this returns true. Defaults to polling while status === 202. */
  shouldPoll?: (data: unknown, status: number) => boolean;
}

export function useApi<T>(path: string | null, options?: UseApiOptions) {
  const [state, setState] = useState<UseApiState<T>>({
    data: undefined,
    error: undefined,
    isLoading: path !== null,
    status: undefined,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const refetch = useCallback(() => {
    if (path === null) return;
    setState((prev) => ({ ...prev, isLoading: true, error: undefined }));
    api
      .getWithStatus<T>(path)
      .then((res) =>
        setState({
          data: res.data,
          error: undefined,
          isLoading: false,
          status: res.status,
        })
      )
      .catch((err: unknown) =>
        setState({
          data: undefined,
          error:
            err instanceof ApiClientError
              ? err
              : new ApiClientError(0, "UNKNOWN", String(err)),
          isLoading: false,
          status: undefined,
        })
      );
  }, [path]);

  // Initial fetch
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Polling
  useEffect(() => {
    if (!options?.pollInterval || path === null) return;

    const shouldContinue =
      options.shouldPoll ?? ((_d: unknown, s: number) => s === 202);

    const id = setInterval(() => {
      const cur = stateRef.current;
      if (
        cur.status !== undefined &&
        !shouldContinue(cur.data, cur.status)
      ) {
        clearInterval(id);
        return;
      }
      api
        .getWithStatus<T>(path)
        .then((res) =>
          setState({
            data: res.data,
            error: undefined,
            isLoading: false,
            status: res.status,
          })
        )
        .catch(() => {
          // Keep previous data on poll error
        });
    }, options.pollInterval);

    return () => clearInterval(id);
  }, [options?.pollInterval, options?.shouldPoll, path]);

  return { ...state, refetch };
}
