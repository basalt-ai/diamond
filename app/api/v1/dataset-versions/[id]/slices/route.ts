import { manageSlices } from "@/contexts/dataset";
import { withApiMiddleware } from "@/lib/api/middleware";
import { parseUUID } from "@/lib/api/params";
import { ok } from "@/lib/api/response";

export const GET = withApiMiddleware(async (_req, ctx) => {
  const { id } = await ctx.params;
  const versionId = parseUUID(id);
  const slices = await manageSlices.listByVersion(versionId);
  return ok(slices);
});
