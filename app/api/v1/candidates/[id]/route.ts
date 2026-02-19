import { NextRequest } from "next/server";

import { manageCandidates } from "@/contexts/candidate";
import { withApiMiddleware } from "@/lib/api/middleware";
import { ok } from "@/lib/api/response";
import type { UUID } from "@/shared/types";

export const GET = withApiMiddleware(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const result = await manageCandidates.get(id as UUID);
  return ok(result);
});
