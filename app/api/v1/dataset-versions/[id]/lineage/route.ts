import { z } from "zod";

import { manageDatasetVersions } from "@/contexts/dataset";
import type {
  LineageCandidate,
  LineageData,
} from "@/contexts/dataset/domain/value-objects/Lineage";
import { withApiMiddleware } from "@/lib/api/middleware";
import { parseUUID } from "@/lib/api/params";
import { ok, paginated } from "@/lib/api/response";
import { parseQuery } from "@/lib/api/validate";
import { NotFoundError } from "@/lib/domain/DomainError";

const querySchema = z.object({
  candidate_id: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(500).default(100),
});

export const GET = withApiMiddleware(async (req, ctx) => {
  const { id } = await ctx.params;
  const versionId = parseUUID(id);
  const { candidate_id, page, page_size } = parseQuery(req, querySchema);

  const version = await manageDatasetVersions.get(versionId);

  const lineage = version.lineage as LineageData | null;
  if (!lineage) {
    throw new NotFoundError("Lineage", versionId);
  }

  // Drill-down to specific candidate
  if (candidate_id) {
    const candidate = lineage.candidates.find(
      (c) => c.candidate_id === candidate_id
    );
    if (!candidate) {
      throw new NotFoundError("LineageCandidate", candidate_id);
    }
    return ok(candidate);
  }

  // Paginate candidates
  const allCandidates = lineage.candidates;
  const total = allCandidates.length;
  const offset = (page - 1) * page_size;
  const paginatedCandidates = allCandidates.slice(offset, offset + page_size);

  return ok({
    scenario_graph_version: lineage.scenario_graph_version,
    selection_policy: lineage.selection_policy,
    candidate_count: lineage.candidate_count,
    captured_at: lineage.captured_at,
    candidates: {
      data: paginatedCandidates,
      pagination: {
        total,
        page,
        pageSize: page_size,
        totalPages: Math.ceil(total / page_size),
      },
    },
  });
});
