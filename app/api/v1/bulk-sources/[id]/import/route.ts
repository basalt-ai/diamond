import { NextRequest } from "next/server";
import { z } from "zod";

import { manageBulkSources } from "@/contexts/ingestion";
import { withApiMiddleware } from "@/lib/api/middleware";
import { parseUUID } from "@/lib/api/params";
import { accepted } from "@/lib/api/response";
import { parseBody } from "@/lib/api/validate";

const importSchema = z.object({
  batch_size: z.number().int().positive().max(5000).default(500),
});

export const POST = withApiMiddleware(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const input = await parseBody(req, importSchema);
  const result = await manageBulkSources.startImport(
    parseUUID(id),
    input.batch_size
  );
  return accepted(result);
});
