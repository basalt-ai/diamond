import { NextRequest } from "next/server";
import { z } from "zod";

import { manageScoringRuns } from "@/contexts/intelligence";
import { withApiMiddleware } from "@/lib/api/middleware";
import { created, paginated } from "@/lib/api/response";
import { guardScoringRun } from "@/lib/api/singletonRun";
import { parseQuery } from "@/lib/api/validate";

const listSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(20),
});

export const POST = withApiMiddleware(async (req: NextRequest) => {
  await guardScoringRun(() => manageScoringRuns.hasActiveRun());

  const triggeredBy = req.headers.get("x-api-key-id");
  const result = await manageScoringRuns.create(triggeredBy);

  // TODO: Enqueue scoring_run.execute job via pg-boss when worker is connected
  return created(result);
});

export const GET = withApiMiddleware(async (req: NextRequest) => {
  const query = parseQuery(req, listSchema);
  const offset = (query.page - 1) * query.page_size;
  const runs = await manageScoringRuns.list({
    limit: query.page_size,
    offset,
  });
  return paginated(runs, runs.length, query.page, query.page_size);
});
