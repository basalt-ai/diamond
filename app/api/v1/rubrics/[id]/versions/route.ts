import { NextRequest } from "next/server";

import { manageRubrics } from "@/contexts/scenario";
import { withApiMiddleware } from "@/lib/api/middleware";
import { ok } from "@/lib/api/response";
import type { UUID } from "@/shared/types";

export const GET = withApiMiddleware(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  // First get the rubric to find its scenarioTypeId
  const rubric = await manageRubrics.getById(id as UUID);
  const versions = await manageRubrics.listVersions(rubric.scenarioTypeId);
  return ok(versions);
});
