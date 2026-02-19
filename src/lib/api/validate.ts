import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError } from "./errors";

export async function parseBody<T extends z.ZodType>(
  req: NextRequest,
  schema: T,
): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw ApiError.badRequest("Invalid JSON body");
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError(422, "VALIDATION_ERROR", "Request body validation failed", {
      issues: result.error.issues,
    });
  }
  return result.data;
}

export function parseQuery<T extends z.ZodType>(
  req: NextRequest,
  schema: T,
): z.infer<T> {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const result = schema.safeParse(params);
  if (!result.success) {
    throw new ApiError(422, "VALIDATION_ERROR", "Query parameter validation failed", {
      issues: result.error.issues,
    });
  }
  return result.data;
}
