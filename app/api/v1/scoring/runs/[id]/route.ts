import { NextRequest } from "next/server";

import { manageScoringRuns } from "@/contexts/intelligence";
import { withApiMiddleware } from "@/lib/api/middleware";
import { ok } from "@/lib/api/response";
import type { UUID } from "@/shared/types";

export const GET = withApiMiddleware(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const run = await manageScoringRuns.get(id as UUID);
  return ok(run);
});
