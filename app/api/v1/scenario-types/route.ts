import { NextRequest } from "next/server";
import { z } from "zod";

import { manageScenarioTypes } from "@/contexts/scenario";
import { withApiMiddleware } from "@/lib/api/middleware";
import { created, paginated } from "@/lib/api/response";
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
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(20),
  parentId: z.string().optional(),
  riskTierId: z.string().uuid().optional(),
  archived: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  name: z.string().optional(),
  needsReview: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

export const POST = withApiMiddleware(async (req: NextRequest) => {
  const input = await parseBody(req, createSchema);
  const result = await manageScenarioTypes.create(input);
  return created(result);
});

export const GET = withApiMiddleware(async (req: NextRequest) => {
  const { page, page_size, ...filters } = parseQuery(req, listQuerySchema);
  const filter = {
    ...filters,
    parentId: filters.parentId === "null" ? null : filters.parentId,
  };
  const all = await manageScenarioTypes.list(filter);
  const start = (page - 1) * page_size;
  const sliced = all.slice(start, start + page_size);
  return paginated(sliced, all.length, page, page_size);
});
