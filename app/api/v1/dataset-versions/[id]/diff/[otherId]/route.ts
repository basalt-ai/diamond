import { computeVersionDiff } from "@/contexts/dataset";
import { withApiMiddleware } from "@/lib/api/middleware";
import { parseUUID } from "@/lib/api/params";
import { ok } from "@/lib/api/response";

export const GET = withApiMiddleware(async (_req, ctx) => {
  const { id, otherId } = await ctx.params;
  const result = await computeVersionDiff.execute(
    parseUUID(id),
    parseUUID(otherId, "otherId")
  );
  return ok(result);
});
