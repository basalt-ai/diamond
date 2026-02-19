import { NextRequest } from "next/server";
import { z } from "zod";

import { manageDatasetSuites } from "@/contexts/dataset";
import { withApiMiddleware } from "@/lib/api/middleware";
import { created, paginated } from "@/lib/api/response";
import { parseBody, parseQuery } from "@/lib/api/validate";

const createSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional().default(""),
});

const listSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(50),
});

export const POST = withApiMiddleware(async (req: NextRequest) => {
  const input = await parseBody(req, createSchema);
  const result = await manageDatasetSuites.create(input);
  return created(result);
});

export const GET = withApiMiddleware(async (req: NextRequest) => {
  const query = parseQuery(req, listSchema);
  const { data, total } = await manageDatasetSuites.list(
    query.page,
    query.page_size
  );
  return paginated(data, total, query.page, query.page_size);
});
