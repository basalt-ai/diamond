import { NextRequest } from "next/server";

import { manageClusteringRuns } from "@/contexts/intelligence";
import { withApiMiddleware } from "@/lib/api/middleware";
import { parseUUID } from "@/lib/api/params";
import { ok } from "@/lib/api/response";

export const GET = withApiMiddleware(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const run = await manageClusteringRuns.get(parseUUID(id));
  return ok(run);
});
