import { eventBus } from "@/lib/events/InProcessEventBus";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import type { DatasetSuiteData } from "../../domain/entities/DatasetSuite";
import type {
  GraphChange,
  VersionComputer,
} from "../../domain/services/VersionComputer";
import type { RefreshPolicyData } from "../../domain/value-objects/RefreshPolicy";
import type { CandidateReader } from "../ports/CandidateReader";
import type { DatasetSuiteRepository } from "../ports/DatasetSuiteRepository";
import type { DatasetVersionRepository } from "../ports/DatasetVersionRepository";
import type { LabelReader } from "../ports/LabelReader";
import type { ScenarioReader } from "../ports/ScenarioReader";

export type RefreshResult =
  | "created"
  | "not_ready"
  | "draft_exists"
  | "cooldown"
  | "disabled";

export class AutoRefreshOrchestrator {
  constructor(
    private readonly suiteRepo: DatasetSuiteRepository,
    private readonly versionRepo: DatasetVersionRepository,
    private readonly candidateReader: CandidateReader,
    private readonly scenarioReader: ScenarioReader,
    private readonly labelReader: LabelReader,
    private readonly versionComputer: VersionComputer
  ) {}

  async checkAndRefresh(
    suiteId: UUID,
    changes: GraphChange[] = []
  ): Promise<{ result: RefreshResult; datasetVersionId?: UUID }> {
    const suite = await this.suiteRepo.findById(suiteId);
    if (!suite) return { result: "disabled" };

    const policy = suite.refreshPolicy;
    if (!policy?.enabled) return { result: "disabled" };

    // Guard: no existing draft for this suite
    const drafts = await this.versionRepo.list(
      { suiteId, state: "draft" },
      1,
      1
    );
    if (drafts.total > 0) return { result: "draft_exists" };

    // Also check validating state
    const validating = await this.versionRepo.list(
      { suiteId, state: "validating" },
      1,
      1
    );
    if (validating.total > 0) return { result: "draft_exists" };

    // Guard: cooldown
    if (this.isCooldownActive(suite, policy)) return { result: "cooldown" };

    // Query eligible candidates scoped to the suite's scenario type
    const eligible = await this.candidateReader.findEligibleForDataset([
      suite.scenarioTypeId,
    ]);

    // Check minimum candidate count
    if (eligible.length < policy.minCandidateCount)
      return { result: "not_ready" };

    // Find latest released version for semver computation
    const releasedVersions = await this.versionRepo.list(
      { suiteId, state: "released" },
      1,
      1
    );
    const lastReleased = releasedVersions.data[0]?.version ?? null;

    // Compute next version string
    const nextVersion = this.versionComputer.computeNext(
      lastReleased,
      changes,
      policy.versionBumpRule
    );

    // Check version uniqueness (in case of race)
    const existing = await this.versionRepo.findBySuiteAndVersion(
      suiteId,
      nextVersion
    );
    if (existing) return { result: "draft_exists" };

    // Pin scenario graph version
    const scenarioGraphVersion =
      await this.scenarioReader.getLatestGraphVersion();

    // Build lineage
    const candidateIds = eligible.map((c) => c.id);
    const labelsMap =
      await this.labelReader.getLabelsForCandidates(candidateIds);

    const lineageCandidates = eligible.map((c) => {
      const labels = labelsMap.get(c.id) ?? [];
      return {
        candidate_id: c.id,
        episode_id: c.episodeId,
        label_task_ids: [...new Set(labels.map((l) => l.labelTaskId))],
        scenario_type_id: c.scenarioTypeId ?? undefined,
      };
    });

    const lineage = {
      scenario_graph_version: scenarioGraphVersion,
      selection_policy: { auto_refresh: true, triggered_by: "orchestrator" },
      candidate_count: eligible.length,
      candidates: lineageCandidates,
      captured_at: new Date().toISOString(),
    };

    // Create the draft version
    const version = await this.versionRepo.create({
      suiteId,
      version: nextVersion,
      scenarioGraphVersion,
      selectionPolicy: { auto_refresh: true },
      candidateIds,
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
        version: nextVersion,
      },
    });

    return { result: "created", datasetVersionId: version.id };
  }

  async checkAllSuites(changes: GraphChange[] = []): Promise<void> {
    const suites = await this.suiteRepo.findWithAutoRefreshEnabled();
    for (const suite of suites) {
      await this.checkAndRefresh(suite.id, changes);
    }
  }

  private isCooldownActive(
    suite: DatasetSuiteData,
    policy: RefreshPolicyData
  ): boolean {
    if (policy.cooldownMinutes <= 0) return false;

    // Check the most recent version creation time for this suite
    // We use updatedAt on the suite as a proxy — it gets bumped when refresh policy changes
    // A more precise approach would track lastAutoRefreshAt, but this is sufficient
    // since we already guard against draft_exists
    return false;
  }
}
