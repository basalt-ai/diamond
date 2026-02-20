import { NotFoundError } from "@/lib/domain/DomainError";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import {
  ScoringRun,
  type ScoringRunData,
} from "../../domain/entities/ScoringRun";
import { ScoringRunNotFoundError } from "../../domain/errors";
import { EMBEDDING_CONFIG } from "../../infrastructure/OpenAIEmbeddingProvider";
import type { ScoringRunRepository } from "../ports/ScoringRunRepository";

export class ManageScoringRuns {
  constructor(private readonly repo: ScoringRunRepository) {}

  async create(triggeredBy: string | null): Promise<ScoringRunData> {
    const run = new ScoringRun({
      id: generateId() as UUID,
      state: "pending",
      totalCandidates: 0,
      processedCount: 0,
      errorCount: 0,
      embeddingModelId: EMBEDDING_CONFIG.modelId,
      triggeredBy,
      startedAt: null,
      completedAt: null,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.repo.save(run);
    return run.toData();
  }

  async get(id: UUID): Promise<ScoringRunData> {
    const run = await this.repo.findById(id);
    if (!run) throw new ScoringRunNotFoundError(id);
    return run.toData();
  }

  async list(options?: {
    limit?: number;
    offset?: number;
  }): Promise<ScoringRunData[]> {
    const runs = await this.repo.list(options);
    return runs.map((r) => r.toData());
  }

  async hasActiveRun(): Promise<boolean> {
    const active = await this.repo.findActive();
    return active !== null;
  }
}
