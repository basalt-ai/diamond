import { ApiError } from "@/lib/api/errors";
import { NotFoundError } from "@/lib/domain/DomainError";
import { eventBus } from "@/lib/events/InProcessEventBus";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import type { ReleaseGatePolicyData } from "../../domain/entities/ReleaseGatePolicy";
import {
  DuplicateGatePolicyError,
  ReleaseGatePolicyNotFoundError,
} from "../../domain/errors";
import type { DatasetSuiteRepository } from "../ports/DatasetSuiteRepository";
import type {
  CreateGatePolicyParams,
  ReleaseGatePolicyRepository,
  UpdateGatePolicyParams,
} from "../ports/ReleaseGatePolicyRepository";

const MAX_POLICIES_PER_SUITE = 20;
const VALID_METRICS = [
  "agreement",
  "redundancy",
  "coverage",
  "drift",
  "entropy",
  "leakage",
];
const VALID_COMPARISONS = ["gte", "lte"];
const VALID_SCOPES = ["overall", "per_scenario", "per_slice"];

export class ManageReleaseGatePolicies {
  constructor(
    private readonly repo: ReleaseGatePolicyRepository,
    private readonly suiteRepo: DatasetSuiteRepository
  ) {}

  async create(
    suiteId: UUID,
    input: {
      gateName: string;
      metric: string;
      threshold: number;
      comparison: string;
      scope?: string;
      sliceFilter?: unknown;
      blocking?: boolean;
      enabled?: boolean;
    }
  ): Promise<ReleaseGatePolicyData> {
    const suite = await this.suiteRepo.findById(suiteId);
    if (!suite) throw new NotFoundError("DatasetSuite", suiteId);

    this.validateMetric(input.metric);
    this.validateComparison(input.comparison);
    this.validateScope(input.scope ?? "overall");

    const existing = await this.repo.findBySuiteIdAndName(
      suiteId,
      input.gateName
    );
    if (existing) throw new DuplicateGatePolicyError(input.gateName);

    const policyCount = await this.repo.countBySuiteId(suiteId);
    if (policyCount >= MAX_POLICIES_PER_SUITE) {
      throw new ApiError(
        422,
        "POLICY_LIMIT_EXCEEDED",
        `Maximum ${MAX_POLICIES_PER_SUITE} policies per suite`
      );
    }

    const params: CreateGatePolicyParams = {
      suiteId,
      gateName: input.gateName,
      metric: input.metric,
      threshold: input.threshold,
      comparison: input.comparison,
      scope: input.scope ?? "overall",
      sliceFilter: input.sliceFilter ?? null,
      blocking: input.blocking ?? true,
      enabled: input.enabled ?? true,
    };

    const policy = await this.repo.create(params);

    await eventBus.publish({
      eventId: generateId(),
      eventType: "release_gate_policy.created",
      aggregateId: policy.id,
      occurredAt: new Date(),
      payload: {
        policy_id: policy.id,
        suite_id: suiteId,
        gate_name: policy.gateName,
        metric: policy.metric,
      },
    });

    return policy;
  }

  async get(id: UUID): Promise<ReleaseGatePolicyData> {
    const policy = await this.repo.findById(id);
    if (!policy) throw new ReleaseGatePolicyNotFoundError(id);
    return policy;
  }

  async listBySuite(suiteId: UUID): Promise<ReleaseGatePolicyData[]> {
    const suite = await this.suiteRepo.findById(suiteId);
    if (!suite) throw new NotFoundError("DatasetSuite", suiteId);
    return this.repo.findBySuiteId(suiteId);
  }

  async update(
    id: UUID,
    input: UpdateGatePolicyParams
  ): Promise<ReleaseGatePolicyData> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new ReleaseGatePolicyNotFoundError(id);

    if (input.metric) this.validateMetric(input.metric);
    if (input.comparison) this.validateComparison(input.comparison);
    if (input.scope) this.validateScope(input.scope);

    if (input.gateName && input.gateName !== existing.gateName) {
      const duplicate = await this.repo.findBySuiteIdAndName(
        existing.suiteId,
        input.gateName
      );
      if (duplicate) throw new DuplicateGatePolicyError(input.gateName);
    }

    return this.repo.update(id, input);
  }

  async delete(id: UUID): Promise<void> {
    const policy = await this.repo.findById(id);
    if (!policy) throw new ReleaseGatePolicyNotFoundError(id);

    await this.repo.delete(id);

    await eventBus.publish({
      eventId: generateId(),
      eventType: "release_gate_policy.deleted",
      aggregateId: id,
      occurredAt: new Date(),
      payload: {
        policy_id: id,
        suite_id: policy.suiteId,
        gate_name: policy.gateName,
      },
    });
  }

  private validateMetric(metric: string): void {
    if (!VALID_METRICS.includes(metric)) {
      throw new ApiError(
        422,
        "INVALID_METRIC",
        `Metric must be one of: ${VALID_METRICS.join(", ")}`
      );
    }
  }

  private validateComparison(comparison: string): void {
    if (!VALID_COMPARISONS.includes(comparison)) {
      throw new ApiError(
        422,
        "INVALID_COMPARISON",
        `Comparison must be one of: ${VALID_COMPARISONS.join(", ")}`
      );
    }
  }

  private validateScope(scope: string): void {
    if (!VALID_SCOPES.includes(scope)) {
      throw new ApiError(
        422,
        "INVALID_SCOPE",
        `Scope must be one of: ${VALID_SCOPES.join(", ")}`
      );
    }
  }
}
