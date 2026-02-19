import { manageDatasetSuites } from "@/contexts/dataset";
import { withApiMiddleware } from "@/lib/api/middleware";
import { ok } from "@/lib/api/response";
import type { UUID } from "@/shared/types";

export const GET = withApiMiddleware(async (_req, ctx) => {
  const { id } = await ctx.params;
  return ok(await manageDatasetSuites.get(id as UUID));
});
