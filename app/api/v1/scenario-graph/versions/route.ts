import { NextRequest } from "next/server";
import { z } from "zod";

import { readScenarioGraph } from "@/contexts/scenario";
import { withApiMiddleware } from "@/lib/api/middleware";
import { parseQuery } from "@/lib/api/validate";

export const GET = withApiMiddleware(async (req: NextRequest) => {
  const query = parseQuery(
    req,
    z.object({
      limit: z
        .string()
        .transform(Number)
        .pipe(z.number().int().positive().max(100))
        .optional(),
      offset: z
        .string()
        .transform(Number)
        .pipe(z.number().int().nonnegative())
        .optional(),
    })
  );

  const result = await readScenarioGraph.listVersions(
    query.limit,
    query.offset
  );

  return Response.json({
    data: result.data,
    pagination: {
      total: result.total,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    },
  });
});
