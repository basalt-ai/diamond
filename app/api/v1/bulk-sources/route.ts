import { NextRequest } from "next/server";
import { z } from "zod";

import { manageBulkSources } from "@/contexts/ingestion";
import { withApiMiddleware } from "@/lib/api/middleware";
import { created, paginated } from "@/lib/api/response";
import { parseBody, parseQuery } from "@/lib/api/validate";

const createSchema = z.object({
  name: z.string().min(1).max(255),
  uri: z.string().min(1).max(2048),
  source_label: z.string().min(1).max(255).optional(),
});

const listSchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(50),
});

export const POST = withApiMiddleware(async (req: NextRequest) => {
  const input = await parseBody(req, createSchema);
  const result = await manageBulkSources.create({
    name: input.name,
    uri: input.uri,
    sourceLabel: input.source_label,
  });
  return created(result);
});

export const GET = withApiMiddleware(async (req: NextRequest) => {
  const query = parseQuery(req, listSchema);
  const { data, total } = await manageBulkSources.list(
    { status: query.status },
    query.page,
    query.page_size
  );
  return paginated(data, total, query.page, query.page_size);
});
