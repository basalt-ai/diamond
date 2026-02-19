import { and, eq, ilike, isNull, sql } from "drizzle-orm";

import type { Database } from "@/db";
import {
  scContextProfiles,
  scFailureModes,
  scRiskTiers,
  scScenarioTypeContextProfiles,
  scScenarioTypeFailureModes,
  scScenarioTypes,
} from "@/db/schema/scenario";
import { NotFoundError } from "@/lib/domain/DomainError";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import type { ScenarioRepository } from "../application/ports/ScenarioRepository";
import type {
  CreateContextProfileInput,
  ContextProfileData,
  UpdateContextProfileInput,
} from "../domain/entities/ContextProfile";
import type {
  CreateFailureModeInput,
  FailureModeData,
  UpdateFailureModeInput,
} from "../domain/entities/FailureMode";
import type {
  CreateRiskTierInput,
  RiskTierData,
  UpdateRiskTierInput,
} from "../domain/entities/RiskTier";
import type {
  CreateScenarioTypeInput,
  ListScenarioTypesFilter,
  ScenarioTypeData,
  ScenarioTypeWithRelations,
  UpdateScenarioTypeInput,
} from "../domain/entities/ScenarioType";

export class DrizzleScenarioRepository implements ScenarioRepository {
  constructor(private readonly db: Database) {}

  // ── FailureModes ──────────────────────────────────────────────

  async createFailureMode(
    input: CreateFailureModeInput
  ): Promise<FailureModeData> {
    const id = generateId();
    const [row] = await this.db
      .insert(scFailureModes)
      .values({
        id,
        name: input.name,
        description: input.description ?? "",
        severity: input.severity,
      })
      .returning();
    return row as FailureModeData;
  }

  async getFailureMode(id: UUID): Promise<FailureModeData> {
    const [row] = await this.db
      .select()
      .from(scFailureModes)
      .where(eq(scFailureModes.id, id));
    if (!row) throw new NotFoundError("FailureMode", id);
    return row as FailureModeData;
  }

  async listFailureModes(): Promise<FailureModeData[]> {
    const rows = await this.db.select().from(scFailureModes);
    return rows as FailureModeData[];
  }

  async updateFailureMode(
    id: UUID,
    input: UpdateFailureModeInput
  ): Promise<FailureModeData> {
    const [row] = await this.db
      .update(scFailureModes)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(scFailureModes.id, id))
      .returning();
    if (!row) throw new NotFoundError("FailureMode", id);
    return row as FailureModeData;
  }

  async deleteFailureMode(id: UUID): Promise<void> {
    const [row] = await this.db
      .delete(scFailureModes)
      .where(eq(scFailureModes.id, id))
      .returning({ id: scFailureModes.id });
    if (!row) throw new NotFoundError("FailureMode", id);
  }

  async isFailureModeReferenced(id: UUID): Promise<boolean> {
    const [row] = await this.db
      .select()
      .from(scScenarioTypeFailureModes)
      .where(eq(scScenarioTypeFailureModes.failureModeId, id))
      .limit(1);
    return !!row;
  }

  // ── RiskTiers ─────────────────────────────────────────────────

  async createRiskTier(input: CreateRiskTierInput): Promise<RiskTierData> {
    const id = generateId();
    const [row] = await this.db
      .insert(scRiskTiers)
      .values({
        id,
        name: input.name,
        weight: input.weight,
        category: input.category,
      })
      .returning();
    return row as RiskTierData;
  }

  async getRiskTier(id: UUID): Promise<RiskTierData> {
    const [row] = await this.db
      .select()
      .from(scRiskTiers)
      .where(eq(scRiskTiers.id, id));
    if (!row) throw new NotFoundError("RiskTier", id);
    return row as RiskTierData;
  }

  async listRiskTiers(): Promise<RiskTierData[]> {
    const rows = await this.db.select().from(scRiskTiers);
    return rows as RiskTierData[];
  }

  async updateRiskTier(
    id: UUID,
    input: UpdateRiskTierInput
  ): Promise<RiskTierData> {
    const [row] = await this.db
      .update(scRiskTiers)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(scRiskTiers.id, id))
      .returning();
    if (!row) throw new NotFoundError("RiskTier", id);
    return row as RiskTierData;
  }

  async deleteRiskTier(id: UUID): Promise<void> {
    const [row] = await this.db
      .delete(scRiskTiers)
      .where(eq(scRiskTiers.id, id))
      .returning({ id: scRiskTiers.id });
    if (!row) throw new NotFoundError("RiskTier", id);
  }

  async isRiskTierReferenced(id: UUID): Promise<boolean> {
    const [row] = await this.db
      .select()
      .from(scScenarioTypes)
      .where(eq(scScenarioTypes.riskTierId, id))
      .limit(1);
    return !!row;
  }

  // ── ContextProfiles ───────────────────────────────────────────

  async createContextProfile(
    input: CreateContextProfileInput
  ): Promise<ContextProfileData> {
    const id = generateId();
    const [row] = await this.db
      .insert(scContextProfiles)
      .values({
        id,
        name: input.name,
        attributes: input.attributes ?? {},
      })
      .returning();
    return row as ContextProfileData;
  }

  async getContextProfile(id: UUID): Promise<ContextProfileData> {
    const [row] = await this.db
      .select()
      .from(scContextProfiles)
      .where(eq(scContextProfiles.id, id));
    if (!row) throw new NotFoundError("ContextProfile", id);
    return row as ContextProfileData;
  }

  async listContextProfiles(): Promise<ContextProfileData[]> {
    const rows = await this.db.select().from(scContextProfiles);
    return rows as ContextProfileData[];
  }

  async updateContextProfile(
    id: UUID,
    input: UpdateContextProfileInput
  ): Promise<ContextProfileData> {
    const [row] = await this.db
      .update(scContextProfiles)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(scContextProfiles.id, id))
      .returning();
    if (!row) throw new NotFoundError("ContextProfile", id);
    return row as ContextProfileData;
  }

  async deleteContextProfile(id: UUID): Promise<void> {
    const [row] = await this.db
      .delete(scContextProfiles)
      .where(eq(scContextProfiles.id, id))
      .returning({ id: scContextProfiles.id });
    if (!row) throw new NotFoundError("ContextProfile", id);
  }

  async isContextProfileReferenced(id: UUID): Promise<boolean> {
    const [row] = await this.db
      .select()
      .from(scScenarioTypeContextProfiles)
      .where(eq(scScenarioTypeContextProfiles.contextProfileId, id))
      .limit(1);
    return !!row;
  }

  // ── ScenarioTypes ─────────────────────────────────────────────

  async createScenarioType(
    input: CreateScenarioTypeInput
  ): Promise<ScenarioTypeWithRelations> {
    const id = generateId();
    const [row] = await this.db
      .insert(scScenarioTypes)
      .values({
        id,
        name: input.name,
        description: input.description ?? "",
        parentId: input.parentId ?? null,
        riskTierId: input.riskTierId,
      })
      .returning();
    if (!row) throw new Error("Failed to create ScenarioType");

    if (input.failureModeIds?.length) {
      await this.db.insert(scScenarioTypeFailureModes).values(
        input.failureModeIds.map((fmId) => ({
          scenarioTypeId: id,
          failureModeId: fmId,
        }))
      );
    }

    if (input.contextProfileIds?.length) {
      await this.db.insert(scScenarioTypeContextProfiles).values(
        input.contextProfileIds.map((cpId) => ({
          scenarioTypeId: id,
          contextProfileId: cpId,
        }))
      );
    }

    return {
      ...(row as ScenarioTypeData),
      failureModeIds: (input.failureModeIds ?? []) as UUID[],
      contextProfileIds: (input.contextProfileIds ?? []) as UUID[],
    };
  }

  async getScenarioType(id: UUID): Promise<ScenarioTypeWithRelations> {
    const [row] = await this.db
      .select()
      .from(scScenarioTypes)
      .where(eq(scScenarioTypes.id, id));
    if (!row) throw new NotFoundError("ScenarioType", id);

    const fmRows = await this.db
      .select({ failureModeId: scScenarioTypeFailureModes.failureModeId })
      .from(scScenarioTypeFailureModes)
      .where(eq(scScenarioTypeFailureModes.scenarioTypeId, id));

    const cpRows = await this.db
      .select({
        contextProfileId: scScenarioTypeContextProfiles.contextProfileId,
      })
      .from(scScenarioTypeContextProfiles)
      .where(eq(scScenarioTypeContextProfiles.scenarioTypeId, id));

    return {
      ...(row as ScenarioTypeData),
      failureModeIds: fmRows.map((r) => r.failureModeId as UUID),
      contextProfileIds: cpRows.map((r) => r.contextProfileId as UUID),
    };
  }

  async listScenarioTypes(
    filter?: ListScenarioTypesFilter
  ): Promise<ScenarioTypeData[]> {
    const conditions = [];

    if (filter?.parentId !== undefined) {
      conditions.push(
        filter.parentId === null
          ? isNull(scScenarioTypes.parentId)
          : eq(scScenarioTypes.parentId, filter.parentId)
      );
    }

    if (filter?.riskTierId) {
      conditions.push(eq(scScenarioTypes.riskTierId, filter.riskTierId));
    }

    if (filter?.archived !== undefined) {
      conditions.push(eq(scScenarioTypes.archived, filter.archived));
    }

    if (filter?.name) {
      conditions.push(ilike(scScenarioTypes.name, `%${filter.name}%`));
    }

    const rows = await this.db
      .select()
      .from(scScenarioTypes)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return rows as ScenarioTypeData[];
  }

  async updateScenarioType(
    id: UUID,
    input: UpdateScenarioTypeInput
  ): Promise<ScenarioTypeWithRelations> {
    const { failureModeIds, contextProfileIds, ...fields } = input;

    const updates: Record<string, unknown> = {
      ...fields,
      updatedAt: new Date(),
    };
    // Handle explicit null parentId (move to root)
    if ("parentId" in input) {
      updates.parentId = input.parentId ?? null;
    }

    const [row] = await this.db
      .update(scScenarioTypes)
      .set(updates)
      .where(eq(scScenarioTypes.id, id))
      .returning();
    if (!row) throw new NotFoundError("ScenarioType", id);

    if (failureModeIds !== undefined) {
      await this.db
        .delete(scScenarioTypeFailureModes)
        .where(eq(scScenarioTypeFailureModes.scenarioTypeId, id));
      if (failureModeIds.length > 0) {
        await this.db.insert(scScenarioTypeFailureModes).values(
          failureModeIds.map((fmId) => ({
            scenarioTypeId: id,
            failureModeId: fmId,
          }))
        );
      }
    }

    if (contextProfileIds !== undefined) {
      await this.db
        .delete(scScenarioTypeContextProfiles)
        .where(eq(scScenarioTypeContextProfiles.scenarioTypeId, id));
      if (contextProfileIds.length > 0) {
        await this.db.insert(scScenarioTypeContextProfiles).values(
          contextProfileIds.map((cpId) => ({
            scenarioTypeId: id,
            contextProfileId: cpId,
          }))
        );
      }
    }

    // Re-fetch relations
    const fmRows = await this.db
      .select({ failureModeId: scScenarioTypeFailureModes.failureModeId })
      .from(scScenarioTypeFailureModes)
      .where(eq(scScenarioTypeFailureModes.scenarioTypeId, id));

    const cpRows = await this.db
      .select({
        contextProfileId: scScenarioTypeContextProfiles.contextProfileId,
      })
      .from(scScenarioTypeContextProfiles)
      .where(eq(scScenarioTypeContextProfiles.scenarioTypeId, id));

    return {
      ...(row as ScenarioTypeData),
      failureModeIds: fmRows.map((r) => r.failureModeId as UUID),
      contextProfileIds: cpRows.map((r) => r.contextProfileId as UUID),
    };
  }

  async archiveScenarioType(id: UUID): Promise<ScenarioTypeData> {
    const [row] = await this.db
      .update(scScenarioTypes)
      .set({ archived: true, updatedAt: new Date() })
      .where(eq(scScenarioTypes.id, id))
      .returning();
    if (!row) throw new NotFoundError("ScenarioType", id);
    return row as ScenarioTypeData;
  }

  async getAncestorIds(id: UUID): Promise<UUID[]> {
    const result = await this.db.execute(sql`
      WITH RECURSIVE ancestors AS (
        SELECT parent_id FROM sc_scenario_types WHERE id = ${id}
        UNION ALL
        SELECT st.parent_id FROM sc_scenario_types st
        JOIN ancestors a ON st.id = a.parent_id
        WHERE a.parent_id IS NOT NULL
      )
      SELECT parent_id FROM ancestors WHERE parent_id IS NOT NULL
    `);
    return result.map((r) => (r as { parent_id: string }).parent_id as UUID);
  }
}
