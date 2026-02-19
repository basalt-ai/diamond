import { NextRequest } from "next/server";
import { z } from "zod";

import { manageLabels } from "@/contexts/labeling";
import { LABEL_TYPES } from "@/contexts/labeling/domain/value-objects/LabelValue";
import { withApiMiddleware } from "@/lib/api/middleware";
import { created, paginated } from "@/lib/api/response";
import { parseBody, parseQuery } from "@/lib/api/validate";
import type { UUID } from "@/shared/types";

const submitSchema = z.object({
  label_task_id: z.string().uuid(),
  annotator_id: z.string().uuid(),
  label_type: z.enum(LABEL_TYPES),
  value: z.unknown(),
  confidence: z.number().min(0).max(1),
  rationale: z.string().optional(),
});

const listSchema = z.object({
  label_task_id: z.string().uuid(),
  include_history: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(50),
});

export const POST = withApiMiddleware(async (req: NextRequest) => {
  const input = await parseBody(req, submitSchema);
  const result = await manageLabels.submit(input);
  return created(result);
});

export const GET = withApiMiddleware(async (req: NextRequest) => {
  const query = parseQuery(req, listSchema);
  const { data, total } = await manageLabels.listByTaskId(
    query.label_task_id as UUID,
    query.page,
    query.page_size,
    query.include_history
  );
  return paginated(data, total, query.page, query.page_size);
});
