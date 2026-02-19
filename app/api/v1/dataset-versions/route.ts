import { NextRequest } from "next/server";
import { z } from "zod";

import { manageDatasetVersions } from "@/contexts/dataset";
import { DATASET_VERSION_STATES } from "@/contexts/dataset/domain/entities/DatasetVersion";
import { withApiMiddleware } from "@/lib/api/middleware";
import { created, paginated } from "@/lib/api/response";
import { parseBody, parseQuery } from "@/lib/api/validate";
import type { UUID } from "@/shared/types";

const createSchema = z.object({
  suite_id: z.string().uuid(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Must be semver format"),
  candidate_ids: z.array(z.string().uuid()).min(1),
  selection_policy: z.record(z.string(), z.unknown()).optional(),
});

const listSchema = z.object({
  suite_id: z.string().uuid().optional(),
  state: z.enum(DATASET_VERSION_STATES).optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(50),
});

export const POST = withApiMiddleware(async (req: NextRequest) => {
  const input = await parseBody(req, createSchema);
  const result = await manageDatasetVersions.create(input);
  return created(result);
});

export const GET = withApiMiddleware(async (req: NextRequest) => {
  const query = parseQuery(req, listSchema);
  const filter = {
    suiteId: query.suite_id as UUID | undefined,
    state: query.state,
  };
  const { data, total } = await manageDatasetVersions.list(
    filter,
    query.page,
    query.page_size
  );
  return paginated(data, total, query.page, query.page_size);
});
