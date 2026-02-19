import { manageExports } from "@/contexts/export";
import { withApiMiddleware } from "@/lib/api/middleware";
import { ok } from "@/lib/api/response";
import type { UUID } from "@/shared/types";

export const GET = withApiMiddleware(async (_req, ctx) => {
  const { id } = await ctx.params;
  return ok(await manageExports.get(id as UUID));
});
