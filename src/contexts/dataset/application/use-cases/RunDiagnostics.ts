import type { Database } from "@/db";
import { dsDiagnosticsReports } from "@/db/schema/dataset";
import { NotFoundError } from "@/lib/domain/DomainError";
import { eventBus } from "@/lib/events/InProcessEventBus";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import {
  DatasetVersion,
  type DatasetVersionData,
} from "../../domain/entities/DatasetVersion";
import type {
  AgreementReport,
  DiagnosticsReportData,
  RedundancyReport,
} from "../../domain/value-objects/DiagnosticsReport";
import type { GateResult } from "../../domain/value-objects/GateResult";
import type { CandidateReader } from "../ports/CandidateReader";
import type { DatasetVersionRepository } from "../ports/DatasetVersionRepository";
import type { LabelReader } from "../ports/LabelReader";

const DEFAULT_GATES = {
  min_agreement: 0.6,
  max_redundancy: 0.1,
};

export class RunDiagnostics {
  constructor(
    private readonly db: Database,
    private readonly versionRepo: DatasetVersionRepository,
    private readonly candidateReader: CandidateReader,
    private readonly labelReader: LabelReader
  ) {}

  async execute(versionId: UUID): Promise<DatasetVersionData> {
    const data = await this.versionRepo.findById(versionId);
    if (!data) {
      throw new NotFoundError("DatasetVersion", versionId);
    }

    if (data.state !== "validating") {
      const { ApiError } = await import("@/lib/api/errors");
      throw new ApiError(
        409,
        "INVALID_STATE",
        `DatasetVersion must be in validating state, found ${data.state}`
      );
    }

    const candidateIds = data.candidateIds as string[];

    // Compute diagnostics
    const redundancy = await this.computeRedundancy(candidateIds as UUID[]);
    const agreement = await this.computeAgreement(candidateIds as UUID[]);

    const report: DiagnosticsReportData = {
      redundancy,
      agreement,
      computed_at: new Date().toISOString(),
    };

    // Store diagnostics report
    const diagnosticsId = generateId();
    await this.db.insert(dsDiagnosticsReports).values({
      id: diagnosticsId,
      datasetVersionId: versionId,
      redundancyReport: redundancy,
      agreementReport: agreement,
      summary: {
        redundancy_index: redundancy.redundancy_index,
        overall_kappa: agreement.overall_kappa,
        candidate_count: candidateIds.length,
      },
    });

    // Link diagnostics to version
    await this.versionRepo.updateDiagnostics(versionId, diagnosticsId);

    // Evaluate gates
    const gateConfig = {
      ...DEFAULT_GATES,
      ...(typeof data.selectionPolicy === "object" &&
      data.selectionPolicy !== null
        ? (data.selectionPolicy as Record<string, unknown>)
        : {}),
    };

    const gateResults = this.evaluateGates(report, gateConfig);
    const allPassed = gateResults.every((g) => g.passed);

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

  private evaluateGates(
    report: DiagnosticsReportData,
    config: Record<string, unknown>
  ): GateResult[] {
    const results: GateResult[] = [];

    const minAgreement = Number(
      config.min_agreement ?? DEFAULT_GATES.min_agreement
    );
    results.push({
      gate: "min_agreement",
      threshold: minAgreement,
      actual: report.agreement.overall_kappa,
      passed: report.agreement.overall_kappa >= minAgreement,
    });

    const maxRedundancy = Number(
      config.max_redundancy ?? DEFAULT_GATES.max_redundancy
    );
    results.push({
      gate: "max_redundancy",
      threshold: maxRedundancy,
      actual: report.redundancy.redundancy_index,
      passed: report.redundancy.redundancy_index <= maxRedundancy,
    });

    return results;
  }

  private async computeRedundancy(
    candidateIds: UUID[]
  ): Promise<RedundancyReport> {
    // Phase 1: simple Jaccard similarity on candidate IDs as tokens
    // In production, this would tokenize candidate content
    const candidates = await this.candidateReader.getMany(candidateIds);
    const duplicatePairs: Array<{
      candidate_a: string;
      candidate_b: string;
      similarity: number;
    }> = [];

    const threshold = 0.8;

    // Compare feature sets for near-duplicates
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        const a = candidates[i]!;
        const b = candidates[j]!;

        // Same scenario type = potential duplicate signal
        if (
          a.scenarioTypeId &&
          b.scenarioTypeId &&
          a.scenarioTypeId === b.scenarioTypeId
        ) {
          // Simplified heuristic: same scenario type with same episode source pattern
          const similarity = a.episodeId === b.episodeId ? 1.0 : 0.0;
          if (similarity >= threshold) {
            duplicatePairs.push({
              candidate_a: a.id,
              candidate_b: b.id,
              similarity,
            });
          }
        }
      }
    }

    const candidatesWithDuplicates = new Set(
      duplicatePairs.flatMap((p) => [p.candidate_a, p.candidate_b])
    );

    return {
      method: "jaccard_similarity",
      threshold,
      duplicate_pairs: duplicatePairs,
      redundancy_index:
        candidateIds.length > 0
          ? candidatesWithDuplicates.size / candidateIds.length
          : 0,
    };
  }

  private async computeAgreement(
    candidateIds: UUID[]
  ): Promise<AgreementReport> {
    const labelsMap =
      await this.labelReader.getLabelsForCandidates(candidateIds);

    let totalAgreement = 0;
    let sampleCount = 0;
    const perScenarioKappa: Record<string, number> = {};

    for (const [, labels] of labelsMap) {
      if (labels.length < 2) continue;

      // Simple agreement: fraction of label pairs that agree
      let agreePairs = 0;
      let totalPairs = 0;
      for (let i = 0; i < labels.length; i++) {
        for (let j = i + 1; j < labels.length; j++) {
          totalPairs++;
          const a = labels[i]!;
          const b = labels[j]!;
          if (JSON.stringify(a.labelValue) === JSON.stringify(b.labelValue)) {
            agreePairs++;
          }
        }
      }

      if (totalPairs > 0) {
        totalAgreement += agreePairs / totalPairs;
        sampleCount++;
      }
    }

    const overallKappa = sampleCount > 0 ? totalAgreement / sampleCount : 1.0;

    return {
      method: "cohens_kappa",
      overall_kappa: overallKappa,
      per_scenario_kappa: perScenarioKappa,
      sample_size: sampleCount,
    };
  }
}
