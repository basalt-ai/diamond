import { NextRequest } from "next/server";
import { z } from "zod";

import { manageLabelTasks } from "@/contexts/labeling";
import { LABEL_TASK_STATES } from "@/contexts/labeling/domain/entities/LabelTask";
import { withApiMiddleware } from "@/lib/api/middleware";
import { parseUUID } from "@/lib/api/params";
import { ok } from "@/lib/api/response";
import { parseBody } from "@/lib/api/validate";

const transitionSchema = z.object({
  state: z.enum(LABEL_TASK_STATES),
  assigned_to: z.string().uuid().optional(),
  reason: z.string().optional(),
  adjudication_record: z
    .object({
      adjudicator_id: z.string().uuid(),
      resolution_type: z.enum(["selected_existing", "submitted_new"]),
      selected_label_id: z.string().uuid().optional(),
      new_label_id: z.string().uuid().optional(),
      disagreement_metric: z.number(),
      conflicting_label_ids: z.array(z.string().uuid()),
      rationale: z.string(),
      resolved_at: z.coerce.date(),
    })
    .optional(),
});

export const PATCH = withApiMiddleware(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const body = await parseBody(req, transitionSchema);
  const result = await manageLabelTasks.transition(parseUUID(id), body.state, {
    assigned_to: body.assigned_to,
    reason: body.reason,
    adjudication_record: body.adjudication_record as
      | import("@/contexts/labeling/domain/value-objects/AdjudicationRecord").AdjudicationRecord
      | undefined,
  });
  return ok(result);
});
