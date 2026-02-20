import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import {
  SelectionRun,
  type SelectionConstraints,
  type SelectionRunData,
} from "../../domain/entities/SelectionRun";
import { SelectionRunNotFoundError } from "../../domain/errors";
import type { SelectionRunRepository } from "../ports/SelectionRunRepository";

export class ManageSelectionRuns {
  constructor(private readonly repo: SelectionRunRepository) {}

  async create(
    constraints: SelectionConstraints,
    triggeredBy: string | null
  ): Promise<SelectionRunData> {
    const run = new SelectionRun({
      id: generateId() as UUID,
      state: "pending",
      constraints,
      selectedCount: 0,
      totalPoolSize: 0,
      coverageImprovement: null,
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

  async get(id: UUID): Promise<SelectionRunData> {
    const run = await this.repo.findById(id);
    if (!run) throw new SelectionRunNotFoundError(id);
    return run.toData();
  }

  async list(options?: {
    limit?: number;
    offset?: number;
  }): Promise<SelectionRunData[]> {
    const runs = await this.repo.list(options);
    return runs.map((r) => r.toData());
  }

  async hasActiveRun(): Promise<boolean> {
    const active = await this.repo.findActive();
    return active !== null;
  }
}
