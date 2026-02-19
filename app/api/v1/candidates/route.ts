import { NextRequest } from "next/server";
import { z } from "zod";

import { manageCandidates } from "@/contexts/candidate";
import { CANDIDATE_STATES } from "@/contexts/candidate/domain/entities/Candidate";
import { withApiMiddleware } from "@/lib/api/middleware";
import { created, paginated } from "@/lib/api/response";
import { parseBody, parseQuery } from "@/lib/api/validate";
import type { UUID } from "@/shared/types";

const createSchema = z.object({
  episode_id: z.string().uuid(),
  scenario_type_id: z.string().uuid().optional(),
});

const listSchema = z.object({
  state: z.enum(CANDIDATE_STATES).optional(),
  scenario_type_id: z.string().uuid().optional(),
  episode_id: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(50),
});

export const POST = withApiMiddleware(async (req: NextRequest) => {
  const input = await parseBody(req, createSchema);
  const result = await manageCandidates.create(input);
  return created(result);
});

export const GET = withApiMiddleware(async (req: NextRequest) => {
  const query = parseQuery(req, listSchema);
  const filter = {
    state: query.state,
    scenarioTypeId: query.scenario_type_id as UUID | undefined,
    episodeId: query.episode_id as UUID | undefined,
  };
  const { data, total } = await manageCandidates.list(
    filter,
    query.page,
    query.page_size
  );
  return paginated(data, total, query.page, query.page_size);
});
