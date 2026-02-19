import { NextRequest } from "next/server";
import { z } from "zod";

import { manageEpisodes } from "@/contexts/ingestion";
import { withApiMiddleware } from "@/lib/api/middleware";
import { created, ok, paginated } from "@/lib/api/response";
import { parseBody, parseQuery } from "@/lib/api/validate";

const createSchema = z.object({
  source: z.string().min(1),
  occurred_at: z.string().datetime().optional(),
  inputs: z.record(z.string(), z.unknown()),
  outputs: z.record(z.string(), z.unknown()),
  trace: z.record(z.string(), z.unknown()).optional().default({}),
  outcomes: z.record(z.string(), z.unknown()).optional().default({}),
  user_segment: z
    .object({
      locale: z.string().optional(),
      plan_tier: z.string().optional(),
      device: z.string().optional(),
    })
    .optional()
    .default({}),
  model_version: z.string().optional(),
  scenario_type_id: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

const listSchema = z.object({
  source: z.string().optional(),
  model_version: z.string().optional(),
  occurred_after: z.string().datetime().optional(),
  occurred_before: z.string().datetime().optional(),
  has_negative_feedback: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  locale: z.string().optional(),
  plan_tier: z.string().optional(),
  device: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(50),
});

export const POST = withApiMiddleware(async (req: NextRequest) => {
  const input = await parseBody(req, createSchema);
  const { episode, isNew } = await manageEpisodes.ingest(input);
  return isNew ? created(episode) : ok(episode);
});

export const GET = withApiMiddleware(async (req: NextRequest) => {
  const query = parseQuery(req, listSchema);
  const filter = {
    source: query.source,
    modelVersion: query.model_version,
    occurredAfter: query.occurred_after
      ? new Date(query.occurred_after)
      : undefined,
    occurredBefore: query.occurred_before
      ? new Date(query.occurred_before)
      : undefined,
    hasNegativeFeedback: query.has_negative_feedback,
    locale: query.locale,
    planTier: query.plan_tier,
    device: query.device,
  };
  const { data, total } = await manageEpisodes.list(
    filter,
    query.page,
    query.page_size
  );
  return paginated(data, total, query.page, query.page_size);
});
