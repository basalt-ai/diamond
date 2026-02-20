import { NextRequest } from "next/server";

import { induceScenarios } from "@/contexts/intelligence";
import { withApiMiddleware } from "@/lib/api/middleware";
import { parseUUID } from "@/lib/api/params";
import { ok } from "@/lib/api/response";

export const POST = withApiMiddleware(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const result = await induceScenarios.execute(parseUUID(id));
  return ok(result);
});
