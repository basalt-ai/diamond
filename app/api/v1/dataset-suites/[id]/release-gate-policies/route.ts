import { NextRequest } from "next/server";
import { z } from "zod";

import { manageReleaseGatePolicies } from "@/contexts/dataset";
import { withApiMiddleware } from "@/lib/api/middleware";
import { parseUUID } from "@/lib/api/params";
import { created, ok } from "@/lib/api/response";
import { parseBody } from "@/lib/api/validate";

const SliceFilterSchema = z
  .object({
    sliceNames: z.array(z.string()).optional(),
    scenarioTypeIds: z.array(z.string().uuid()).optional(),
  })
  .strict();

const createSchema = z.object({
  gateName: z.string().min(1).max(100),
  metric: z.string().min(1).max(50),
  threshold: z.number(),
  comparison: z.string().min(1).max(10),
  scope: z.string().max(20).optional(),
  sliceFilter: SliceFilterSchema.optional(),
  blocking: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

export const POST = withApiMiddleware(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const suiteId = parseUUID(id);
  const input = await parseBody(req, createSchema);
  const result = await manageReleaseGatePolicies.create(suiteId, input);
  return created(result);
});

export const GET = withApiMiddleware(async (_req, ctx) => {
  const { id } = await ctx.params;
  const suiteId = parseUUID(id);
  const policies = await manageReleaseGatePolicies.listBySuite(suiteId);
  return ok(policies);
});
