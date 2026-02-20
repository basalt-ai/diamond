import { NextRequest } from "next/server";
import { z } from "zod";

import { manageClusteringRuns } from "@/contexts/intelligence";
import { withApiMiddleware } from "@/lib/api/middleware";
import { created, paginated } from "@/lib/api/response";
import { parseBody, parseQuery } from "@/lib/api/validate";

const createSchema = z.object({
  min_cluster_size: z.coerce.number().int().positive().default(5),
});

const listSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(20),
});

export const POST = withApiMiddleware(async (req: NextRequest) => {
  const input = await parseBody(req, createSchema);
  const triggeredBy = req.headers.get("x-api-key-id");
  const result = await manageClusteringRuns.create({
    minClusterSize: input.min_cluster_size,
    triggeredBy,
  });
  return created(result);
});

export const GET = withApiMiddleware(async (req: NextRequest) => {
  const query = parseQuery(req, listSchema);
  const offset = (query.page - 1) * query.page_size;
  const { runs, total } = await manageClusteringRuns.list({
    limit: query.page_size,
    offset,
  });
  return paginated(runs, total, query.page, query.page_size);
});
