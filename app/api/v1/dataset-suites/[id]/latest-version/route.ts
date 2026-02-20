import { manageDatasetVersions } from "@/contexts/dataset";
import { withApiMiddleware } from "@/lib/api/middleware";
import { parseUUID } from "@/lib/api/params";
import { ok } from "@/lib/api/response";

export const GET = withApiMiddleware(async (_req, ctx) => {
  const { id } = await ctx.params;
  const suiteId = parseUUID(id);

  const result = await manageDatasetVersions.list(
    { suiteId, state: "released" },
    1,
    1
  );

  const latest = result.data[0] ?? null;
  return ok(latest);
});
