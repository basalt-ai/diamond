import { z } from "zod";

import { DrizzleDatasetVersionRepository } from "@/contexts/dataset/infrastructure/DrizzleDatasetVersionRepository";
import { DrizzleDiagnosticsReportRepository } from "@/contexts/dataset/infrastructure/DrizzleDiagnosticsReportRepository";
import { db } from "@/db";
import { withApiMiddleware } from "@/lib/api/middleware";
import { parseUUID } from "@/lib/api/params";
import { accepted, ok } from "@/lib/api/response";
import { parseQuery } from "@/lib/api/validate";
import { NotFoundError } from "@/lib/domain/DomainError";

const querySchema = z.object({
  slice: z.string().optional(),
});

const versionRepo = new DrizzleDatasetVersionRepository(db);
const diagnosticsRepo = new DrizzleDiagnosticsReportRepository(db);

export const GET = withApiMiddleware(async (req, ctx) => {
  const { id } = await ctx.params;
  const versionId = parseUUID(id);
  const { slice } = parseQuery(req, querySchema);

  const version = await versionRepo.findById(versionId);
  if (!version) {
    throw new NotFoundError("DatasetVersion", versionId);
  }

  // Check for existing diagnostics report
  if (version.diagnosticsId) {
    const report = await diagnosticsRepo.findByVersionId(versionId);
    if (report) {
      const metrics = report.metrics as Record<string, unknown>;

      // If slice filter requested, filter per_slice_kappa etc.
      if (slice) {
        return ok({
          id: report.id,
          dataset_version_id: report.datasetVersionId,
          metrics,
          gate_results: report.gateResults,
          summary: report.summary,
          slice_filter: slice,
          created_at: report.createdAt,
        });
      }

      return ok({
        id: report.id,
        dataset_version_id: report.datasetVersionId,
        metrics: report.metrics,
        gate_results: report.gateResults,
        summary: report.summary,
        created_at: report.createdAt,
      });
    }
  }

  // If validating but no report yet, return 202
  if (version.state === "validating") {
    return accepted({ status: "computing", dataset_version_id: versionId });
  }

  throw new NotFoundError("DiagnosticsReport", versionId);
});
