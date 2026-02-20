import { manageExports } from "@/contexts/export";
import { withApiMiddleware } from "@/lib/api/middleware";
import { parseUUID } from "@/lib/api/params";
import { ok } from "@/lib/api/response";

export const GET = withApiMiddleware(async (_req, ctx) => {
  const { id } = await ctx.params;
  return ok(await manageExports.get(parseUUID(id)));
});
