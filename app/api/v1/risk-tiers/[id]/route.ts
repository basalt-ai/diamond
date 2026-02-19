import { NextRequest } from "next/server";
import { z } from "zod";

import { manageRiskTiers } from "@/contexts/scenario";
import { withApiMiddleware } from "@/lib/api/middleware";
import { noContent, ok } from "@/lib/api/response";
import { parseBody } from "@/lib/api/validate";
import type { UUID } from "@/shared/types";

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  weight: z.number().gt(0).lte(1).optional(),
  category: z.enum(["business", "safety", "compliance"]).optional(),
});

export const GET = withApiMiddleware(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const result = await manageRiskTiers.get(id as UUID);
  return ok(result);
});

export const PUT = withApiMiddleware(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const input = await parseBody(req, updateSchema);
  const result = await manageRiskTiers.update(id as UUID, input);
  return ok(result);
});

export const DELETE = withApiMiddleware(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  await manageRiskTiers.delete(id as UUID);
  return noContent();
});
