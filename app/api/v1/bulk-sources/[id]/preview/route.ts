import { NextRequest } from "next/server";
import { z } from "zod";

import { manageBulkSources } from "@/contexts/ingestion";
import { withApiMiddleware } from "@/lib/api/middleware";
import { ok } from "@/lib/api/response";
import { parseBody } from "@/lib/api/validate";
import type { UUID } from "@/shared/types";

const previewSchema = z.object({
  limit: z.number().int().positive().max(100).default(5),
});

export const POST = withApiMiddleware(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const input = await parseBody(req, previewSchema);
  const rows = await manageBulkSources.preview(id as UUID, input.limit);
  return ok({ rows });
});
