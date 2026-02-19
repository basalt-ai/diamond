import { NextRequest } from "next/server";
import { z } from "zod";

import { manageExports } from "@/contexts/export";
import { EXPORT_JOB_STATES } from "@/contexts/export/domain/entities/ExportJob";
import { EXPORT_FORMATS } from "@/contexts/export/domain/value-objects/ExportFormat";
import { withApiMiddleware } from "@/lib/api/middleware";
import { created, paginated } from "@/lib/api/response";
import { parseBody, parseQuery } from "@/lib/api/validate";
import type { UUID } from "@/shared/types";

const createSchema = z.object({
  dataset_version_id: z.string().uuid(),
  format: z.enum(EXPORT_FORMATS).default("jsonl"),
});

const listSchema = z.object({
  dataset_version_id: z.string().uuid().optional(),
  format: z.enum(EXPORT_FORMATS).optional(),
  state: z.enum(EXPORT_JOB_STATES).optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(50),
});

export const POST = withApiMiddleware(async (req: NextRequest) => {
  const input = await parseBody(req, createSchema);
  const result = await manageExports.create(input);
  return created(result);
});

export const GET = withApiMiddleware(async (req: NextRequest) => {
  const query = parseQuery(req, listSchema);
  const filter = {
    datasetVersionId: query.dataset_version_id as UUID | undefined,
    format: query.format,
    state: query.state,
  };
  const { data, total } = await manageExports.list(
    filter,
    query.page,
    query.page_size
  );
  return paginated(data, total, query.page, query.page_size);
});
