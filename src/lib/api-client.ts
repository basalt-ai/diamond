export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: Record<string, unknown>;
  };
}

const BASE = "/api/v1";

export interface ApiResponse<T> {
  data: T;
  status: number;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  const url = `${BASE}${path}`;
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);

  if (!res.ok) {
    let envelope: ApiErrorEnvelope | undefined;
    try {
      envelope = (await res.json()) as ApiErrorEnvelope;
    } catch {
      // non-JSON error response
    }
    throw new ApiClientError(
      res.status,
      envelope?.error.code ?? "UNKNOWN",
      envelope?.error.message ?? res.statusText,
      envelope?.error.requestId,
      envelope?.error.details
    );
  }

  if (res.status === 204) {
    return { data: undefined as T, status: res.status };
  }

  const data = (await res.json()) as T;
  return { data, status: res.status };
}

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>("GET", path).then((r) => r.data);
  },
  getWithStatus<T>(path: string): Promise<ApiResponse<T>> {
    return request<T>("GET", path);
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>("POST", path, body).then((r) => r.data);
  },
  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>("PUT", path, body).then((r) => r.data);
  },
  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>("PATCH", path, body).then((r) => r.data);
  },
  del<T = void>(path: string): Promise<T> {
    return request<T>("DELETE", path).then((r) => r.data);
  },
};
