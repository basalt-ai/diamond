import { NextRequest } from "next/server";

import { manageBulkSources } from "@/contexts/ingestion";
import { withApiMiddleware } from "@/lib/api/middleware";
import { parseUUID } from "@/lib/api/params";
import { ok } from "@/lib/api/response";

export const PUT = withApiMiddleware(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const body = (await req.json()) as Record<string, unknown>;
  const result = await manageBulkSources.submitMapping(parseUUID(id), body);
  return ok(result);
});
