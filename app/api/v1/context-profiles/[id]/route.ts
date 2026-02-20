import { NextRequest } from "next/server";
import { z } from "zod";

import { manageContextProfiles } from "@/contexts/scenario";
import { withApiMiddleware } from "@/lib/api/middleware";
import { parseUUID } from "@/lib/api/params";
import { noContent, ok } from "@/lib/api/response";
import { parseBody } from "@/lib/api/validate";

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const GET = withApiMiddleware(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const result = await manageContextProfiles.get(parseUUID(id));
  return ok(result);
});

export const PUT = withApiMiddleware(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const input = await parseBody(req, updateSchema);
  const result = await manageContextProfiles.update(parseUUID(id), input);
  return ok(result);
});

export const DELETE = withApiMiddleware(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  await manageContextProfiles.delete(parseUUID(id));
  return noContent();
});
