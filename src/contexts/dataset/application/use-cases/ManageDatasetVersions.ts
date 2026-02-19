import { DuplicateError, NotFoundError } from "@/lib/domain/DomainError";
import { eventBus } from "@/lib/events/InProcessEventBus";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import {
  DatasetVersion,
  type DatasetVersionData,
  type DatasetVersionState,
} from "../../domain/entities/DatasetVersion";
import type { LineageData } from "../../domain/value-objects/Lineage";
import type { CandidateReader } from "../ports/CandidateReader";
import type { DatasetSuiteRepository } from "../ports/DatasetSuiteRepository";
import type {
  DatasetVersionRepository,
  ListVersionsFilter,
  ListVersionsResult,
} from "../ports/DatasetVersionRepository";
import type { LabelReader } from "../ports/LabelReader";
import type { ScenarioReader } from "../ports/ScenarioReader";

export class ManageDatasetVersions {
  constructor(
    private readonly repo: DatasetVersionRepository,
    private readonly suiteRepo: DatasetSuiteRepository,
    private readonly candidateReader: CandidateReader,
    private readonly scenarioReader: ScenarioReader,
    private readonly labelReader: LabelReader
  ) {}

  async create(input: {
    suite_id: string;
    version: string;
    candidate_ids: string[];
    selection_policy?: Record<string, unknown>;
  }): Promise<DatasetVersionData> {
    const suiteId = input.suite_id as UUID;

    // Validate suite exists
    const suite = await this.suiteRepo.findById(suiteId);
    if (!suite) {
      throw new NotFoundError("DatasetSuite", suiteId);
    }

    // Check version uniqueness within suite
    const existing = await this.repo.findBySuiteAndVersion(
      suiteId,
      input.version
    );
    if (existing) {
      throw new DuplicateError("DatasetVersion", "version", input.version);
    }

    // Deduplicate candidate IDs
    const uniqueCandidateIds = [...new Set(input.candidate_ids)];

    // Validate candidates exist and are in eligible state
    const candidates = await this.candidateReader.getMany(
      uniqueCandidateIds as UUID[]
    );
    const foundIds = new Set(candidates.map((c) => c.id));
    const missingIds = uniqueCandidateIds.filter(
      (id) => !foundIds.has(id as UUID)
    );
    if (missingIds.length > 0) {
      throw new NotFoundError("Candidate", missingIds[0]!);
    }

    const ineligible = candidates.filter(
      (c) => c.state !== "validated" && c.state !== "released"
    );
    if (ineligible.length > 0) {
      const { ApiError } = await import("@/lib/api/errors");
      throw new ApiError(
        422,
        "INELIGIBLE_CANDIDATES",
        `Candidates must be in validated or released state. Found ${ineligible.length} ineligible candidate(s).`
      );
    }

    // Pin scenario graph version
    const scenarioGraphVersion =
      await this.scenarioReader.getLatestGraphVersion();

    // Build lineage
    const lineage = await this.buildLineage(
      candidates,
      uniqueCandidateIds as UUID[],
      scenarioGraphVersion,
      input.selection_policy ?? {}
    );

    const version = await this.repo.create({
      suiteId,
      version: input.version,
      scenarioGraphVersion,
      selectionPolicy: input.selection_policy ?? {},
      candidateIds: uniqueCandidateIds,
      lineage,
    });

    // Emit created event
    await eventBus.publish({
      eventId: generateId(),
      eventType: "dataset_version.created",
      aggregateId: version.id,
      occurredAt: new Date(),
      payload: {
        dataset_version_id: version.id,
        suite_id: suiteId,
        version: input.version,
      },
    });

    return version;
  }

  async get(id: UUID): Promise<DatasetVersionData> {
    const version = await this.repo.findById(id);
    if (!version) {
      throw new NotFoundError("DatasetVersion", id);
    }
    return version;
  }

  async list(
    filter: ListVersionsFilter,
    page: number,
    pageSize: number
  ): Promise<ListVersionsResult> {
    return this.repo.list(filter, page, pageSize);
  }

  async transition(
    id: UUID,
    targetState: DatasetVersionState,
    reason?: string
  ): Promise<DatasetVersionData> {
    const data = await this.repo.findById(id);
    if (!data) {
      throw new NotFoundError("DatasetVersion", id);
    }

    const aggregate = new DatasetVersion(data);

    if (targetState === "deprecated") {
      aggregate.deprecate(reason);
    } else {
      aggregate.transitionTo(targetState);
    }

    const updated = await this.repo.updateState(
      id,
      aggregate.state,
      aggregate.updatedAt,
      aggregate.releasedAt ?? undefined
    );

    await eventBus.publishAll(aggregate.domainEvents);

    return updated;
  }

  private async buildLineage(
    candidates: Array<{
      id: UUID;
      episodeId: UUID;
      scenarioTypeId: UUID | null;
      state: string;
    }>,
    candidateIds: UUID[],
    scenarioGraphVersion: string,
    selectionPolicy: Record<string, unknown>
  ): Promise<LineageData> {
    const labelsMap =
      await this.labelReader.getLabelsForCandidates(candidateIds);

    const lineageCandidates = candidates.map((c) => {
      const labels = labelsMap.get(c.id) ?? [];
      return {
        candidate_id: c.id,
        episode_id: c.episodeId,
        label_task_ids: [...new Set(labels.map((l) => l.labelTaskId))],
        scenario_type_id: c.scenarioTypeId ?? undefined,
      };
    });

    return {
      scenario_graph_version: scenarioGraphVersion,
      selection_policy: selectionPolicy,
      candidate_count: candidates.length,
      candidates: lineageCandidates,
      captured_at: new Date().toISOString(),
    };
  }
}
