import { NextRequest } from "next/server";
import { z } from "zod";

import { manageRefreshPolicies } from "@/contexts/dataset";
import { withApiMiddleware } from "@/lib/api/middleware";
import { parseUUID } from "@/lib/api/params";
import { noContent, ok } from "@/lib/api/response";
import { parseBody } from "@/lib/api/validate";

const refreshPolicySchema = z.object({
  enabled: z.boolean(),
  scenarioTypeScope: z.enum(["all", "explicit"]),
  scenarioTypeIds: z.array(z.string().uuid()).default([]),
  minCandidateCount: z.number().int().min(1),
  minCoveragePercent: z.number().min(0).max(100),
  versionBumpRule: z.enum(["auto", "minor", "patch"]),
  cooldownMinutes: z.number().int().nonnegative(),
  exportFormats: z.array(z.enum(["jsonl", "cobalt", "limestone"])).default([]),
});

export const PUT = withApiMiddleware(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const suiteId = parseUUID(id);
  const input = await parseBody(req, refreshPolicySchema);
  const result = await manageRefreshPolicies.set(suiteId, input);
  return ok(result);
});

export const GET = withApiMiddleware(async (_req, ctx) => {
  const { id } = await ctx.params;
  const suiteId = parseUUID(id);
  const policy = await manageRefreshPolicies.get(suiteId);
  return ok(policy);
});

export const DELETE = withApiMiddleware(async (_req, ctx) => {
  const { id } = await ctx.params;
  const suiteId = parseUUID(id);
  await manageRefreshPolicies.remove(suiteId);
  return noContent();
});
