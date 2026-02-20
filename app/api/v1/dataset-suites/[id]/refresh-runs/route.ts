import { NextRequest } from "next/server";
import { z } from "zod";

import { manageRefreshRuns } from "@/contexts/dataset";
import { withApiMiddleware } from "@/lib/api/middleware";
import { parseUUID } from "@/lib/api/params";
import { created, paginated } from "@/lib/api/response";
import { parseBody, parseQuery } from "@/lib/api/validate";

const triggerSchema = z.object({
  triggeredBy: z.enum(["clustering_run", "scenario_graph_updated", "manual"]),
  triggerEventId: z.string().min(1),
  scenarioChanges: z
    .array(
      z.object({
        change_type: z.enum(["added", "modified", "removed"]),
        entity_type: z.string(),
        entity_id: z.string(),
        summary: z.string().optional(),
      })
    )
    .optional(),
});

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export const POST = withApiMiddleware(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const suiteId = parseUUID(id);
  const input = await parseBody(req, triggerSchema);
  const result = await manageRefreshRuns.trigger({
    suiteId,
    triggeredBy: input.triggeredBy,
    triggerEventId: input.triggerEventId,
    scenarioChanges: input.scenarioChanges,
  });
  return created(result);
});

export const GET = withApiMiddleware(async (req, ctx) => {
  const { id } = await ctx.params;
  const suiteId = parseUUID(id);
  const { page, page_size } = parseQuery(req, listSchema);
  const result = await manageRefreshRuns.listBySuite(suiteId, page, page_size);
  return paginated(result.data, result.total, page, page_size);
});
