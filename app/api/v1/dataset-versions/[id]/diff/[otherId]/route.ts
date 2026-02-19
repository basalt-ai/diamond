import { computeVersionDiff } from "@/contexts/dataset";
import { withApiMiddleware } from "@/lib/api/middleware";
import { ok } from "@/lib/api/response";
import type { UUID } from "@/shared/types";

export const GET = withApiMiddleware(async (_req, ctx) => {
  const { id, otherId } = await ctx.params;
  const result = await computeVersionDiff.execute(id as UUID, otherId as UUID);
  return ok(result);
});
