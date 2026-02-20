import { ApiError } from "@/lib/api/errors";
import { NotFoundError } from "@/lib/domain/DomainError";
import { eventBus } from "@/lib/events/InProcessEventBus";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import {
  DatasetVersion,
  type DatasetVersionData,
} from "../../domain/entities/DatasetVersion";
import type { AgreementComputer } from "../../domain/services/AgreementComputer";
import type { GateEvaluator } from "../../domain/services/GateEvaluator";
import type { RedundancyComputer } from "../../domain/services/RedundancyComputer";
import type { DiagnosticsMetrics } from "../../domain/value-objects/DiagnosticsReport";
import type { CandidateReader } from "../ports/CandidateReader";
import type { DatasetVersionRepository } from "../ports/DatasetVersionRepository";
import type { DiagnosticsReportRepository } from "../ports/DiagnosticsReportRepository";
import type { LabelReader } from "../ports/LabelReader";
import type { ReleaseGatePolicyRepository } from "../ports/ReleaseGatePolicyRepository";

export class RunDiagnostics {
  constructor(
    private readonly versionRepo: DatasetVersionRepository,
    private readonly candidateReader: CandidateReader,
    private readonly labelReader: LabelReader,
    private readonly diagnosticsRepo: DiagnosticsReportRepository,
    private readonly redundancyComputer: RedundancyComputer,
    private readonly agreementComputer: AgreementComputer,
    private readonly gatePolicyRepo: ReleaseGatePolicyRepository,
    private readonly gateEvaluator: GateEvaluator
  ) {}

  async execute(versionId: UUID): Promise<DatasetVersionData> {
    const data = await this.versionRepo.findById(versionId);
    if (!data) {
      throw new NotFoundError("DatasetVersion", versionId);
    }

    if (data.state !== "validating") {
      throw new ApiError(
        409,
        "INVALID_STATE",
        `DatasetVersion must be in validating state, found ${data.state}`
      );
    }

    const candidateIds = data.candidateIds as string[];

    // Compute diagnostics
    const candidates = await this.candidateReader.getMany(
      candidateIds as UUID[]
    );
    const redundancy = this.redundancyComputer.compute(candidates);

    const labelsMap = await this.labelReader.getLabelsForCandidates(
      candidateIds as UUID[]
    );
    const agreement = this.agreementComputer.compute(labelsMap);

    const metrics: DiagnosticsMetrics = {
      redundancy,
      agreement,
      computed_at: new Date().toISOString(),
    };

    const summary = {
      redundancy_index: redundancy.redundancy_index,
      overall_kappa: agreement.overall_kappa,
      candidate_count: candidateIds.length,
    };

    // Evaluate gates
    const policies = await this.gatePolicyRepo.findBySuiteId(data.suiteId);
    const gateResults = this.gateEvaluator.evaluate(metrics, policies);
    const allPassed = gateResults
      .filter((g) => g.blocking)
      .every((g) => g.passed);

    // Store diagnostics report
    const diagnosticsId = generateId();
    await this.diagnosticsRepo.create({
      id: diagnosticsId,
      datasetVersionId: versionId,
      metrics,
      gateResults,
      summary,
    });

    // Link diagnostics to version
    await this.versionRepo.updateDiagnostics(versionId, diagnosticsId);

    // Apply gate results to aggregate
    const aggregate = new DatasetVersion({
      ...data,
      state: "validating",
      diagnosticsId,
    });

    if (allPassed) {
      aggregate.release(gateResults);
    } else {
      aggregate.rejectToDraft(gateResults);
    }

    const updated = await this.versionRepo.updateGateResults(
      versionId,
      gateResults,
      aggregate.state,
      aggregate.updatedAt,
      aggregate.releasedAt ?? undefined
    );

    // Emit diagnostics.completed event
    await eventBus.publish({
      eventId: generateId(),
      eventType: "diagnostics.completed",
      aggregateId: versionId,
      occurredAt: new Date(),
      payload: {
        dataset_version_id: versionId,
        diagnostics_id: diagnosticsId,
        blocked: !allPassed,
        gate_results: gateResults,
      },
    });

    await eventBus.publishAll(aggregate.domainEvents);

    return updated;
  }
}
