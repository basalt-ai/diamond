import { NextRequest } from "next/server";
import { z } from "zod";

import { manageCandidates } from "@/contexts/candidate";
import { CANDIDATE_STATES } from "@/contexts/candidate/domain/entities/Candidate";
import { withApiMiddleware } from "@/lib/api/middleware";
import { ok } from "@/lib/api/response";
import { parseBody } from "@/lib/api/validate";
import type { UUID } from "@/shared/types";

const transitionSchema = z.object({
  target_state: z.enum(CANDIDATE_STATES),
});

export const PATCH = withApiMiddleware(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const { target_state } = await parseBody(req, transitionSchema);
  const result = await manageCandidates.transition(id as UUID, target_state);
  return ok(result);
});
