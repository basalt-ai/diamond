import { NextRequest, NextResponse } from "next/server";

import { DatasetImmutableError } from "@/contexts/dataset/domain/errors";
import {
  MappingValidationError,
  PIIRedactionFailedError,
  SchemaDiscoveryError,
} from "@/contexts/ingestion/domain/errors";
import {
  ConcurrencyConflictError,
  ReferenceIntegrityError,
} from "@/contexts/scenario/domain/errors";
import { auth } from "@/lib/auth";
import {
  NotFoundError,
  InvalidStateTransitionError,
  DuplicateError,
  DomainError,
} from "@/lib/domain/DomainError";
import { generateId } from "@/shared/ids";

import { ApiError } from "./errors";
import { sanitizeError } from "./sanitize";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

type RouteContext = { params: Promise<Record<string, string>> };
type RouteHandler = (req: NextRequest, ctx: RouteContext) => Promise<Response>;
type AuthedRouteHandler = (
  req: NextRequest,
  ctx: RouteContext,
  user: AuthenticatedUser
) => Promise<Response>;

function errorResponse(
  statusCode: number,
  code: string,
  message: string,
  requestId: string,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    { error: { code, message, ...(details && { details }), requestId } },
    { status: statusCode }
  );
}

export function withApiMiddleware(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    const requestId = generateId();

    try {
      return await handler(req, ctx);
    } catch (error) {
      if (error instanceof ApiError) {
        return errorResponse(
          error.statusCode,
          error.code,
          error.message,
          requestId,
          error.details
        );
      }

      if (error instanceof NotFoundError) {
        return errorResponse(404, "NOT_FOUND", error.message, requestId);
      }

      if (error instanceof PIIRedactionFailedError) {
        return errorResponse(502, error.code, error.message, requestId);
      }

      if (error instanceof SchemaDiscoveryError) {
        return errorResponse(422, error.code, error.message, requestId);
      }

      if (error instanceof MappingValidationError) {
        return errorResponse(422, error.code, error.message, requestId);
      }

      if (
        error instanceof InvalidStateTransitionError ||
        error instanceof DuplicateError ||
        error instanceof ReferenceIntegrityError ||
        error instanceof ConcurrencyConflictError ||
        error instanceof DatasetImmutableError
      ) {
        return errorResponse(409, error.code, error.message, requestId);
      }

      if (error instanceof DomainError) {
        return errorResponse(422, error.code, error.message, requestId);
      }

      console.error(`[${requestId}] Unhandled error:`, sanitizeError(error));
      return errorResponse(
        500,
        "INTERNAL_ERROR",
        "An unexpected error occurred",
        requestId
      );
    }
  };
}

/**
 * Wraps a route handler with authentication.
 * Checks Bearer token first (for programmatic access), then session cookie.
 */
export function withAuthMiddleware(handler: AuthedRouteHandler): RouteHandler {
  return withApiMiddleware(async (req, ctx) => {
    // 1. Check Bearer token (programmatic API access)
    const authorization = req.headers.get("authorization") ?? "";
    const [scheme, token] = authorization.split(" ");

    if (scheme === "Bearer" && token) {
      const validKeys = process.env.API_KEYS?.split(",") ?? [];
      if (validKeys.includes(token)) {
        const apiUser: AuthenticatedUser = {
          id: `api-key:${token.slice(0, 8)}`,
          email: "api@diamond.dev",
          name: "API Key",
        };
        return handler(req, ctx, apiUser);
      }
    }

    // 2. Check session cookie
    const session = await auth.api.getSession({ headers: req.headers });

    if (session) {
      const user: AuthenticatedUser = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      };
      return handler(req, ctx, user);
    }

    // 3. Neither — unauthorized
    throw ApiError.unauthorized("Authentication required");
  });
}
