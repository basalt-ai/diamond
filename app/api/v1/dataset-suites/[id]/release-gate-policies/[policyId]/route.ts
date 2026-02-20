import { NextRequest } from "next/server";
import { z } from "zod";

import { manageReleaseGatePolicies } from "@/contexts/dataset";
import { withApiMiddleware } from "@/lib/api/middleware";
import { parseUUID } from "@/lib/api/params";
import { noContent, ok } from "@/lib/api/response";
import { parseBody } from "@/lib/api/validate";

const SliceFilterSchema = z
  .object({
    sliceNames: z.array(z.string()).optional(),
    scenarioTypeIds: z.array(z.string().uuid()).optional(),
  })
  .strict();

const updateSchema = z.object({
  gateName: z.string().min(1).max(100).optional(),
  metric: z.string().min(1).max(50).optional(),
  threshold: z.number().optional(),
  comparison: z.string().min(1).max(10).optional(),
  scope: z.string().max(20).optional(),
  sliceFilter: SliceFilterSchema.optional(),
  blocking: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

export const GET = withApiMiddleware(async (_req, ctx) => {
  const { policyId } = await ctx.params;
  return ok(
    await manageReleaseGatePolicies.get(parseUUID(policyId, "policyId"))
  );
});

export const PUT = withApiMiddleware(async (req: NextRequest, ctx) => {
  const { policyId } = await ctx.params;
  const input = await parseBody(req, updateSchema);
  const result = await manageReleaseGatePolicies.update(
    parseUUID(policyId, "policyId"),
    input
  );
  return ok(result);
});

export const DELETE = withApiMiddleware(async (_req, ctx) => {
  const { policyId } = await ctx.params;
  await manageReleaseGatePolicies.delete(parseUUID(policyId, "policyId"));
  return noContent();
});
