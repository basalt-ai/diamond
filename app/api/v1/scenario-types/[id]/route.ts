import { NextRequest } from "next/server";
import { z } from "zod";

import { manageScenarioTypes } from "@/contexts/scenario";
import { withApiMiddleware } from "@/lib/api/middleware";
import { noContent, ok } from "@/lib/api/response";
import { parseBody } from "@/lib/api/validate";
import type { UUID } from "@/shared/types";

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  parentId: z.string().uuid().nullable().optional(),
  riskTierId: z.string().uuid().optional(),
  failureModeIds: z.array(z.string().uuid()).optional(),
  contextProfileIds: z.array(z.string().uuid()).optional(),
});

export const GET = withApiMiddleware(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const result = await manageScenarioTypes.get(id as UUID);
  return ok(result);
});

export const PUT = withApiMiddleware(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const input = await parseBody(req, updateSchema);
  const result = await manageScenarioTypes.update(id as UUID, input);
  return ok(result);
});

export const DELETE = withApiMiddleware(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  await manageScenarioTypes.archive(id as UUID);
  return noContent();
});
