import { manageRefreshRuns } from "@/contexts/dataset";
import { withApiMiddleware } from "@/lib/api/middleware";
import { parseUUID } from "@/lib/api/params";
import { ok } from "@/lib/api/response";

export const GET = withApiMiddleware(async (_req, ctx) => {
  const { runId } = await ctx.params;
  const id = parseUUID(runId);
  const result = await manageRefreshRuns.get(id);
  return ok(result);
});
