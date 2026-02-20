import { z } from "zod";

import { computeDrift } from "@/contexts/dataset";
import { withApiMiddleware } from "@/lib/api/middleware";
import { parseUUID } from "@/lib/api/params";
import { ok } from "@/lib/api/response";
import { parseQuery } from "@/lib/api/validate";

const querySchema = z.object({
  days: z.coerce.number().int().nonnegative().default(30),
});

export const GET = withApiMiddleware(async (req, ctx) => {
  const { id } = await ctx.params;
  const versionId = parseUUID(id);
  const { days } = parseQuery(req, querySchema);

  const report = await computeDrift.execute(versionId, days);
  return ok(report);
});
