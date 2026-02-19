import { NextRequest } from "next/server";
import { z } from "zod";

import { manageScenarioTypes } from "@/contexts/scenario";
import { withApiMiddleware } from "@/lib/api/middleware";
import { created, ok } from "@/lib/api/response";
import { parseBody, parseQuery } from "@/lib/api/validate";

const createSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  parentId: z.string().uuid().nullable().optional(),
  riskTierId: z.string().uuid(),
  failureModeIds: z.array(z.string().uuid()).optional(),
  contextProfileIds: z.array(z.string().uuid()).optional(),
});

const listQuerySchema = z.object({
  parentId: z.string().optional(),
  riskTierId: z.string().uuid().optional(),
  archived: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  name: z.string().optional(),
});

export const POST = withApiMiddleware(async (req: NextRequest) => {
  const input = await parseBody(req, createSchema);
  const result = await manageScenarioTypes.create(input);
  return created(result);
});

export const GET = withApiMiddleware(async (req: NextRequest) => {
  const query = parseQuery(req, listQuerySchema);
  const filter = {
    ...query,
    parentId: query.parentId === "null" ? null : query.parentId,
  };
  const result = await manageScenarioTypes.list(filter);
  return ok(result);
});
