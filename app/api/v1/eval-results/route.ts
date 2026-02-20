import { NextRequest } from "next/server";
import { z } from "zod";

import { manageEvalRuns } from "@/contexts/dataset";
import { withApiMiddleware } from "@/lib/api/middleware";
import { created, paginated } from "@/lib/api/response";
import { parseBody, parseQuery } from "@/lib/api/validate";
import type { UUID } from "@/shared/types";

const JudgeOutputSchema = z.record(z.string(), z.unknown()).optional();

const EvalMetadataSchema = z
  .object({
    commitSha: z.string().optional(),
    ciUrl: z.string().url().optional(),
    pipelineId: z.string().optional(),
  })
  .strict()
  .optional();

const ingestSchema = z.object({
  datasetVersionId: z.string().uuid(),
  modelName: z.string().min(1).max(100),
  modelVersion: z.string().min(1).max(100),
  evalRunExternalId: z.string().max(200).optional(),
  results: z
    .array(
      z.object({
        candidateId: z.string().uuid(),
        passed: z.boolean(),
        score: z.number().optional(),
        judgeOutput: JudgeOutputSchema,
        failureMode: z.string().max(100).optional(),
      })
    )
    .min(1)
    .max(100_000),
  metadata: EvalMetadataSchema,
});

const listSchema = z.object({
  dataset_version_id: z.string().uuid().optional(),
  model_name: z.string().optional(),
  model_version: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(50),
});

export const POST = withApiMiddleware(async (req: NextRequest) => {
  const input = await parseBody(req, ingestSchema);
  const result = await manageEvalRuns.ingest({
    datasetVersionId: input.datasetVersionId as UUID,
    modelName: input.modelName,
    modelVersion: input.modelVersion,
    evalRunExternalId: input.evalRunExternalId,
    results: input.results.map((r) => ({
      candidateId: r.candidateId as UUID,
      passed: r.passed,
      score: r.score ?? null,
      judgeOutput: (r.judgeOutput as Record<string, unknown>) ?? null,
      failureMode: r.failureMode ?? null,
    })),
    metadata: (input.metadata as Record<string, unknown>) ?? {},
  });
  return created(result);
});

export const GET = withApiMiddleware(async (req: NextRequest) => {
  const query = parseQuery(req, listSchema);
  const { data, total } = await manageEvalRuns.list(
    {
      datasetVersionId: query.dataset_version_id as UUID | undefined,
      modelName: query.model_name,
      modelVersion: query.model_version,
    },
    query.page,
    query.page_size
  );
  return paginated(data, total, query.page, query.page_size);
});
