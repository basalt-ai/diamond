import { NextRequest } from "next/server";
import { z } from "zod";

import { manageFailureModes } from "@/contexts/scenario";
import { withApiMiddleware } from "@/lib/api/middleware";
import { noContent, ok } from "@/lib/api/response";
import { parseBody } from "@/lib/api/validate";
import type { UUID } from "@/shared/types";

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
});

export const GET = withApiMiddleware(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const result = await manageFailureModes.get(id as UUID);
  return ok(result);
});

export const PUT = withApiMiddleware(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const input = await parseBody(req, updateSchema);
  const result = await manageFailureModes.update(id as UUID, input);
  return ok(result);
});

export const DELETE = withApiMiddleware(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  await manageFailureModes.delete(id as UUID);
  return noContent();
});
