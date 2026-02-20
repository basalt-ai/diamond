import { z } from "zod";

import { manageSlices } from "@/contexts/dataset";
import { withApiMiddleware } from "@/lib/api/middleware";
import { parseUUID } from "@/lib/api/params";
import { ok } from "@/lib/api/response";
import { parseBody } from "@/lib/api/validate";

const goldenSchema = z.object({
  golden: z.boolean(),
  force: z.boolean().optional(),
});

export const PATCH = withApiMiddleware(async (req, ctx) => {
  const { sliceId } = await ctx.params;
  const parsedSliceId = parseUUID(sliceId, "sliceId");
  const { golden, force } = await parseBody(req, goldenSchema);

  const result = await manageSlices.setGolden(parsedSliceId, golden, force);
  return ok(result);
});
