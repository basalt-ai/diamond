import { NextRequest } from "next/server";

import { manageBulkSources } from "@/contexts/ingestion";
import { withApiMiddleware } from "@/lib/api/middleware";
import { parseUUID } from "@/lib/api/params";
import { ok } from "@/lib/api/response";

export const GET = withApiMiddleware(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const result = await manageBulkSources.get(parseUUID(id));
  return ok(result);
});
