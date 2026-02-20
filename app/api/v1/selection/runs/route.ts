import { NextRequest } from "next/server";
import { z } from "zod";

import { manageSelectionRuns } from "@/contexts/intelligence";
import { withApiMiddleware } from "@/lib/api/middleware";
import { created, paginated } from "@/lib/api/response";
import { guardSelectionRun } from "@/lib/api/singletonRun";
import { parseBody, parseQuery } from "@/lib/api/validate";

const createSchema = z.object({
  budget: z.number().int().positive(),
});

const listSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(20),
});

export const POST = withApiMiddleware(async (req: NextRequest) => {
  await guardSelectionRun(() => manageSelectionRuns.hasActiveRun());

  const input = await parseBody(req, createSchema);
  const triggeredBy = req.headers.get("x-api-key-id");
  const result = await manageSelectionRuns.create(
    { budget: input.budget },
    triggeredBy
  );

  // TODO: Enqueue selection_run.execute job via pg-boss when worker is connected
  return created(result);
});

export const GET = withApiMiddleware(async (req: NextRequest) => {
  const query = parseQuery(req, listSchema);
  const offset = (query.page - 1) * query.page_size;
  const runs = await manageSelectionRuns.list({
    limit: query.page_size,
    offset,
  });
  return paginated(runs, runs.length, query.page, query.page_size);
});
