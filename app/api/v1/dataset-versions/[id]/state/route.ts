import { z } from "zod";

import { manageDatasetVersions, runDiagnostics } from "@/contexts/dataset";
import { withApiMiddleware } from "@/lib/api/middleware";
import { ok } from "@/lib/api/response";
import { parseBody } from "@/lib/api/validate";
import type { UUID } from "@/shared/types";

const transitionSchema = z.object({
  target_state: z.enum(["validating", "deprecated"]),
  reason: z.string().optional(),
});

export const PATCH = withApiMiddleware(async (req, ctx) => {
  const { id } = await ctx.params;
  const { target_state, reason } = await parseBody(req, transitionSchema);
  const versionId = id as UUID;

  if (target_state === "validating") {
    // Transition to validating, then run diagnostics (which auto-releases or rejects)
    await manageDatasetVersions.transition(versionId, "validating");
    const result = await runDiagnostics.execute(versionId);
    return ok(result);
  }

  // Direct transitions (deprecate)
  const result = await manageDatasetVersions.transition(
    versionId,
    target_state,
    reason
  );
  return ok(result);
});
