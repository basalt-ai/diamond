import { NextRequest } from "next/server";

import { manageRubrics } from "@/contexts/scenario";
import { withApiMiddleware } from "@/lib/api/middleware";
import { parseUUID } from "@/lib/api/params";
import { ok } from "@/lib/api/response";

export const GET = withApiMiddleware(async (_req: NextRequest, ctx) => {
  const { id, version } = await ctx.params;
  // Get the rubric to find its scenarioTypeId
  const rubric = await manageRubrics.getById(parseUUID(id));
  const result = await manageRubrics.getByVersion(
    rubric.scenarioTypeId,
    Number(version)
  );
  return ok(result);
});
