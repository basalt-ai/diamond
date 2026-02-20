import { NextRequest } from "next/server";

import { manageCandidates } from "@/contexts/candidate";
import { withApiMiddleware } from "@/lib/api/middleware";
import { parseUUID } from "@/lib/api/params";
import { ok } from "@/lib/api/response";

export const GET = withApiMiddleware(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const result = await manageCandidates.get(parseUUID(id));
  return ok(result);
});
