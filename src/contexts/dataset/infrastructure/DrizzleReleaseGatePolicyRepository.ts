import { and, count, eq } from "drizzle-orm";

import type { Database } from "@/db";
import { dsReleaseGatePolicies } from "@/db/schema/dataset";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import type {
  CreateGatePolicyParams,
  ReleaseGatePolicyRepository,
  UpdateGatePolicyParams,
} from "../application/ports/ReleaseGatePolicyRepository";
import type { ReleaseGatePolicyData } from "../domain/entities/ReleaseGatePolicy";

export class DrizzleReleaseGatePolicyRepository implements ReleaseGatePolicyRepository {
  constructor(private readonly db: Database) {}

  async create(params: CreateGatePolicyParams): Promise<ReleaseGatePolicyData> {
    const [row] = await this.db
      .insert(dsReleaseGatePolicies)
      .values({
        id: generateId(),
        suiteId: params.suiteId,
        gateName: params.gateName,
        metric: params.metric,
        threshold: params.threshold,
        comparison: params.comparison,
        scope: params.scope,
        sliceFilter: params.sliceFilter,
        blocking: params.blocking,
        enabled: params.enabled,
      })
      .returning();
    return this.toData(row!);
  }

  async findById(id: UUID): Promise<ReleaseGatePolicyData | null> {
    const [row] = await this.db
      .select()
      .from(dsReleaseGatePolicies)
      .where(eq(dsReleaseGatePolicies.id, id));
    return row ? this.toData(row) : null;
  }

  async findBySuiteId(suiteId: UUID): Promise<ReleaseGatePolicyData[]> {
    const rows = await this.db
      .select()
      .from(dsReleaseGatePolicies)
      .where(eq(dsReleaseGatePolicies.suiteId, suiteId));
    return rows.map((r) => this.toData(r));
  }

  async findBySuiteIdAndName(
    suiteId: UUID,
    gateName: string
  ): Promise<ReleaseGatePolicyData | null> {
    const [row] = await this.db
      .select()
      .from(dsReleaseGatePolicies)
      .where(
        and(
          eq(dsReleaseGatePolicies.suiteId, suiteId),
          eq(dsReleaseGatePolicies.gateName, gateName)
        )
      );
    return row ? this.toData(row) : null;
  }

  async update(
    id: UUID,
    params: UpdateGatePolicyParams
  ): Promise<ReleaseGatePolicyData> {
    const [row] = await this.db
      .update(dsReleaseGatePolicies)
      .set({ ...params, updatedAt: new Date() })
      .where(eq(dsReleaseGatePolicies.id, id))
      .returning();
    return this.toData(row!);
  }

  async delete(id: UUID): Promise<void> {
    await this.db
      .delete(dsReleaseGatePolicies)
      .where(eq(dsReleaseGatePolicies.id, id));
  }

  async countBySuiteId(suiteId: UUID): Promise<number> {
    const [result] = await this.db
      .select({ value: count() })
      .from(dsReleaseGatePolicies)
      .where(eq(dsReleaseGatePolicies.suiteId, suiteId));
    return result?.value ?? 0;
  }

  private toData(
    row: typeof dsReleaseGatePolicies.$inferSelect
  ): ReleaseGatePolicyData {
    return {
      id: row.id as UUID,
      suiteId: row.suiteId as UUID,
      gateName: row.gateName,
      metric: row.metric,
      threshold: row.threshold,
      comparison: row.comparison as "gte" | "lte",
      scope: row.scope as "overall" | "per_scenario" | "per_slice",
      sliceFilter: row.sliceFilter as ReleaseGatePolicyData["sliceFilter"],
      blocking: row.blocking,
      enabled: row.enabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
