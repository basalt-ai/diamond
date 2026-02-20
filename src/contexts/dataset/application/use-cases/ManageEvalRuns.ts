import { ApiError } from "@/lib/api/errors";
import { NotFoundError } from "@/lib/domain/DomainError";
import { eventBus } from "@/lib/events/InProcessEventBus";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import type {
  EvalResultData,
  EvalRunData,
} from "../../domain/entities/EvalRun";
import {
  DatasetVersionNotReleasedError,
  DuplicateEvalRunError,
  EvalRunNotFoundError,
} from "../../domain/errors";
import type { DatasetVersionRepository } from "../ports/DatasetVersionRepository";
import type {
  EvalRunRepository,
  EvalRunWithStats,
  ListEvalRunsFilter,
} from "../ports/EvalRunRepository";

export class ManageEvalRuns {
  constructor(
    private readonly evalRunRepo: EvalRunRepository,
    private readonly versionRepo: DatasetVersionRepository
  ) {}

  async ingest(input: {
    datasetVersionId: UUID;
    modelName: string;
    modelVersion: string;
    evalRunExternalId?: string;
    results: EvalResultData[];
    metadata?: Record<string, unknown>;
  }): Promise<EvalRunData> {
    const version = await this.versionRepo.findById(input.datasetVersionId);
    if (!version) {
      throw new NotFoundError("DatasetVersion", input.datasetVersionId);
    }
    if (version.state !== "released") {
      throw new DatasetVersionNotReleasedError(input.datasetVersionId);
    }

    if (input.evalRunExternalId) {
      const existing = await this.evalRunRepo.findByExternalId(
        input.datasetVersionId,
        input.modelName,
        input.modelVersion,
        input.evalRunExternalId
      );
      if (existing) {
        throw new DuplicateEvalRunError(input.evalRunExternalId);
      }
    }

    if (input.results.length === 0) {
      throw new ApiError(
        422,
        "EMPTY_RESULTS",
        "At least one result is required"
      );
    }

    const evalRun = await this.evalRunRepo.createWithResults({
      datasetVersionId: input.datasetVersionId,
      modelName: input.modelName,
      modelVersion: input.modelVersion,
      evalRunExternalId: input.evalRunExternalId ?? null,
      metadata: input.metadata ?? {},
      results: input.results,
    });

    await eventBus.publish({
      eventId: generateId(),
      eventType: "eval_run.ingested",
      aggregateId: evalRun.id,
      occurredAt: new Date(),
      payload: {
        eval_run_id: evalRun.id,
        dataset_version_id: input.datasetVersionId,
        model_name: input.modelName,
        model_version: input.modelVersion,
        result_count: input.results.length,
      },
    });

    return evalRun;
  }

  async get(id: UUID): Promise<EvalRunData> {
    const run = await this.evalRunRepo.findById(id);
    if (!run) throw new EvalRunNotFoundError(id);
    return run;
  }

  async list(
    filter: ListEvalRunsFilter,
    page: number,
    pageSize: number
  ): Promise<{ data: EvalRunWithStats[]; total: number }> {
    return this.evalRunRepo.list(filter, page, pageSize);
  }
}
