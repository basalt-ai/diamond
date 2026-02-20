import { NotFoundError } from "@/lib/domain/DomainError";
import type { UUID } from "@/shared/types";

import type {
  RefreshRunData,
  RefreshRunTrigger,
} from "../../domain/entities/RefreshRun";
import type { GraphChange } from "../../domain/services/VersionComputer";
import type { DatasetSuiteRepository } from "../ports/DatasetSuiteRepository";
import type {
  ListRefreshRunsResult,
  RefreshRunRepository,
} from "../ports/RefreshRunRepository";
import type { AutoRefreshOrchestrator } from "../services/AutoRefreshOrchestrator";

export class ManageRefreshRuns {
  constructor(
    private readonly repo: RefreshRunRepository,
    private readonly suiteRepo: DatasetSuiteRepository,
    private readonly orchestrator: AutoRefreshOrchestrator
  ) {}

  async trigger(input: {
    suiteId: UUID;
    triggeredBy: RefreshRunTrigger;
    triggerEventId: string;
    scenarioChanges?: GraphChange[];
  }): Promise<RefreshRunData> {
    const suite = await this.suiteRepo.findById(input.suiteId);
    if (!suite) throw new NotFoundError("DatasetSuite", input.suiteId);

    const run = await this.repo.create({
      suiteId: input.suiteId,
      triggeredBy: input.triggeredBy,
      triggerEventId: input.triggerEventId,
      scenarioChanges: input.scenarioChanges ?? [],
    });

    const result = await this.orchestrator.checkAndRefresh(
      input.suiteId,
      input.scenarioChanges ?? []
    );

    const finalStatus =
      result === "created" ? "pending_diagnostics" : "failed";
    return this.repo.updateStatus(run.id, finalStatus, {
      completedAt: result !== "created" ? new Date() : undefined,
    });
  }

  async get(id: UUID): Promise<RefreshRunData> {
    const run = await this.repo.findById(id);
    if (!run) throw new NotFoundError("RefreshRun", id);
    return run;
  }

  async listBySuite(
    suiteId: UUID,
    page: number,
    pageSize: number
  ): Promise<ListRefreshRunsResult> {
    const suite = await this.suiteRepo.findById(suiteId);
    if (!suite) throw new NotFoundError("DatasetSuite", suiteId);
    return this.repo.listBySuite(suiteId, page, pageSize);
  }
}
