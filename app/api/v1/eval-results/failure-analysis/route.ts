import { NextRequest } from "next/server";
import { z } from "zod";

import { runFailureAnalysis } from "@/contexts/dataset";
import { withApiMiddleware } from "@/lib/api/middleware";
import { ok } from "@/lib/api/response";
import { parseQuery } from "@/lib/api/validate";
import type { UUID } from "@/shared/types";

const querySchema = z.object({
  dataset_version_id: z.string().uuid(),
});

export const GET = withApiMiddleware(async (req: NextRequest) => {
  const query = parseQuery(req, querySchema);
  const report = await runFailureAnalysis.execute(
    query.dataset_version_id as UUID
  );
  return ok(report);
});
