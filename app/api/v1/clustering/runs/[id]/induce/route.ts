import { NextRequest } from "next/server";

import { induceScenarios } from "@/contexts/intelligence";
import { withApiMiddleware } from "@/lib/api/middleware";
import { ok } from "@/lib/api/response";
import type { UUID } from "@/shared/types";

export const POST = withApiMiddleware(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const result = await induceScenarios.execute(id as UUID);
  return ok(result);
});
