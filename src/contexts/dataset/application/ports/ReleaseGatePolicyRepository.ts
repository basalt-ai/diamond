import type { UUID } from "@/shared/types";

import type { ReleaseGatePolicyData } from "../../domain/entities/ReleaseGatePolicy";

export interface CreateGatePolicyParams {
  suiteId: UUID;
  gateName: string;
  metric: string;
  threshold: number;
  comparison: string;
  scope: string;
  sliceFilter: unknown;
  blocking: boolean;
  enabled: boolean;
}

export interface UpdateGatePolicyParams {
  gateName?: string;
  metric?: string;
  threshold?: number;
  comparison?: string;
  scope?: string;
  sliceFilter?: unknown;
  blocking?: boolean;
  enabled?: boolean;
}

export interface ReleaseGatePolicyRepository {
  create(params: CreateGatePolicyParams): Promise<ReleaseGatePolicyData>;
  findById(id: UUID): Promise<ReleaseGatePolicyData | null>;
  findBySuiteId(suiteId: UUID): Promise<ReleaseGatePolicyData[]>;
  findBySuiteIdAndName(
    suiteId: UUID,
    gateName: string
  ): Promise<ReleaseGatePolicyData | null>;
  update(
    id: UUID,
    params: UpdateGatePolicyParams
  ): Promise<ReleaseGatePolicyData>;
  delete(id: UUID): Promise<void>;
  countBySuiteId(suiteId: UUID): Promise<number>;
}
