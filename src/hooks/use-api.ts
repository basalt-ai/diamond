"use client";

import { useCallback, useEffect, useState } from "react";

import { api, ApiClientError } from "@/lib/api-client";

interface UseApiState<T> {
  data: T | undefined;
  error: ApiClientError | undefined;
  isLoading: boolean;
}

export function useApi<T>(path: string | null) {
  const [state, setState] = useState<UseApiState<T>>({
    data: undefined,
    error: undefined,
    isLoading: path !== null,
  });

  const refetch = useCallback(() => {
    if (path === null) return;
    setState((prev) => ({ ...prev, isLoading: true, error: undefined }));
    api
      .get<T>(path)
      .then((data) => setState({ data, error: undefined, isLoading: false }))
      .catch((err: unknown) =>
        setState({
          data: undefined,
          error:
            err instanceof ApiClientError
              ? err
              : new ApiClientError(0, "UNKNOWN", String(err)),
          isLoading: false,
        })
      );
  }, [path]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ...state, refetch };
}
