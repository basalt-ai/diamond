import { NextRequest } from "next/server";

import { manageBulkSources } from "@/contexts/ingestion";
import { withApiMiddleware } from "@/lib/api/middleware";
import { ok } from "@/lib/api/response";
import type { UUID } from "@/shared/types";

export const PUT = withApiMiddleware(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const body = (await req.json()) as Record<string, unknown>;
  const result = await manageBulkSources.submitMapping(id as UUID, body);
  return ok(result);
});
