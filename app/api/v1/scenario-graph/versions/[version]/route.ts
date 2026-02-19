import { NextRequest } from "next/server";

import { readScenarioGraph } from "@/contexts/scenario";
import { withApiMiddleware } from "@/lib/api/middleware";
import { ok } from "@/lib/api/response";

export const GET = withApiMiddleware(async (_req: NextRequest, ctx) => {
  const { version } = await ctx.params;
  const result = await readScenarioGraph.getByVersion(Number(version));
  return ok(result);
});
