import { NextRequest } from "next/server";
import { z } from "zod";

import { manageBulkSources } from "@/contexts/ingestion";
import { withApiMiddleware } from "@/lib/api/middleware";
import { accepted } from "@/lib/api/response";
import { parseBody } from "@/lib/api/validate";
import type { UUID } from "@/shared/types";

const importSchema = z.object({
  batch_size: z.number().int().positive().max(5000).default(500),
});

export const POST = withApiMiddleware(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const input = await parseBody(req, importSchema);
  const result = await manageBulkSources.startImport(
    id as UUID,
    input.batch_size
  );
  return accepted(result);
});
