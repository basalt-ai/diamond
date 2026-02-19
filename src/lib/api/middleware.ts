import { NextRequest, NextResponse } from "next/server";

import {
  ConcurrencyConflictError,
  ReferenceIntegrityError,
} from "@/contexts/scenario/domain/errors";
import {
  NotFoundError,
  InvalidStateTransitionError,
  DuplicateError,
  DomainError,
} from "@/lib/domain/DomainError";
import { generateId } from "@/shared/ids";

import { ApiError } from "./errors";

type RouteContext = { params: Promise<Record<string, string>> };
type RouteHandler = (req: NextRequest, ctx: RouteContext) => Promise<Response>;

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

      if (
        error instanceof InvalidStateTransitionError ||
        error instanceof DuplicateError ||
        error instanceof ReferenceIntegrityError ||
        error instanceof ConcurrencyConflictError
      ) {
        return errorResponse(409, error.code, error.message, requestId);
      }

      if (error instanceof DomainError) {
        return errorResponse(422, error.code, error.message, requestId);
      }

      console.error(`[${requestId}] Unhandled error:`, error);
      return errorResponse(
        500,
        "INTERNAL_ERROR",
        "An unexpected error occurred",
        requestId
      );
    }
  };
}
