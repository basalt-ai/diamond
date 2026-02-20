import { NotFoundError } from "@/lib/domain/DomainError";
import type { UUID } from "@/shared/types";

import type { DatasetSuiteData } from "../../domain/entities/DatasetSuite";
import type { RefreshPolicyData } from "../../domain/value-objects/RefreshPolicy";
import type { DatasetSuiteRepository } from "../ports/DatasetSuiteRepository";

const VALID_SCENARIO_TYPE_SCOPES = ["all", "explicit"] as const;
const VALID_VERSION_BUMP_RULES = ["auto", "minor", "patch"] as const;
const VALID_EXPORT_FORMATS = ["jsonl", "cobalt", "limestone"] as const;

export class ManageRefreshPolicies {
  constructor(private readonly suiteRepo: DatasetSuiteRepository) {}

  async set(
    suiteId: UUID,
    input: RefreshPolicyData
  ): Promise<DatasetSuiteData> {
    const suite = await this.suiteRepo.findById(suiteId);
    if (!suite) throw new NotFoundError("DatasetSuite", suiteId);

    this.validate(input);

    return this.suiteRepo.updateRefreshPolicy(suiteId, input);
  }

  async get(suiteId: UUID): Promise<RefreshPolicyData | null> {
    const suite = await this.suiteRepo.findById(suiteId);
    if (!suite) throw new NotFoundError("DatasetSuite", suiteId);
    return suite.refreshPolicy;
  }

  async remove(suiteId: UUID): Promise<DatasetSuiteData> {
    const suite = await this.suiteRepo.findById(suiteId);
    if (!suite) throw new NotFoundError("DatasetSuite", suiteId);
    return this.suiteRepo.updateRefreshPolicy(suiteId, null);
  }

  private validate(input: RefreshPolicyData): void {
    if (
      !VALID_SCENARIO_TYPE_SCOPES.includes(
        input.scenarioTypeScope as (typeof VALID_SCENARIO_TYPE_SCOPES)[number]
      )
    ) {
      throw new Error(
        `scenarioTypeScope must be one of: ${VALID_SCENARIO_TYPE_SCOPES.join(", ")}`
      );
    }

    if (
      !VALID_VERSION_BUMP_RULES.includes(
        input.versionBumpRule as (typeof VALID_VERSION_BUMP_RULES)[number]
      )
    ) {
      throw new Error(
        `versionBumpRule must be one of: ${VALID_VERSION_BUMP_RULES.join(", ")}`
      );
    }

    if (
      input.scenarioTypeScope === "explicit" &&
      input.scenarioTypeIds.length === 0
    ) {
      throw new Error(
        "scenarioTypeIds must not be empty when scenarioTypeScope is 'explicit'"
      );
    }

    if (input.minCandidateCount < 1) {
      throw new Error("minCandidateCount must be at least 1");
    }

    if (input.minCoveragePercent < 0 || input.minCoveragePercent > 100) {
      throw new Error("minCoveragePercent must be between 0 and 100");
    }

    if (input.cooldownMinutes < 0) {
      throw new Error("cooldownMinutes must be non-negative");
    }

    for (const fmt of input.exportFormats) {
      if (
        !VALID_EXPORT_FORMATS.includes(
          fmt as (typeof VALID_EXPORT_FORMATS)[number]
        )
      ) {
        throw new Error(
          `Invalid export format '${fmt}'. Must be one of: ${VALID_EXPORT_FORMATS.join(", ")}`
        );
      }
    }
  }
}
