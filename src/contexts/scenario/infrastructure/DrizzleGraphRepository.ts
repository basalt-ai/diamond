import { count, desc, eq, sql } from "drizzle-orm";

import type { Database } from "@/db";
import {
  scContextProfiles,
  scFailureModes,
  scRiskTiers,
  scRubrics,
  scScenarioGraphVersions,
  scScenarioTypeContextProfiles,
  scScenarioTypeFailureModes,
  scScenarioTypes,
} from "@/db/schema/scenario";
import { NotFoundError } from "@/lib/domain/DomainError";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import type { GraphRepository } from "../application/ports/GraphRepository";
import type {
  GraphChange,
  GraphSnapshot,
  ScenarioGraphVersionData,
} from "../domain/entities/ScenarioGraph";

export class DrizzleGraphRepository implements GraphRepository {
  constructor(private readonly db: Database) {}

  async getCurrentVersion(): Promise<number> {
    const [row] = await this.db
      .select({
        maxVersion: sql<number>`coalesce(max(${scScenarioGraphVersions.version}), 0)`,
      })
      .from(scScenarioGraphVersions);
    return row?.maxVersion ?? 0;
  }

  async createVersion(
    snapshot: GraphSnapshot,
    changes: GraphChange[]
  ): Promise<ScenarioGraphVersionData> {
    const currentVersion = await this.getCurrentVersion();
    const nextVersion = currentVersion + 1;
    const id = generateId();

    const [row] = await this.db
      .insert(scScenarioGraphVersions)
      .values({
        id,
        version: nextVersion,
        snapshot,
        changes,
      })
      .returning();
    if (!row) throw new Error("Failed to create graph version");
    return row as unknown as ScenarioGraphVersionData;
  }

  async getLatest(): Promise<ScenarioGraphVersionData> {
    const [row] = await this.db
      .select()
      .from(scScenarioGraphVersions)
      .orderBy(desc(scScenarioGraphVersions.version))
      .limit(1);
    if (!row) throw new NotFoundError("ScenarioGraph", "latest");
    return row as unknown as ScenarioGraphVersionData;
  }

  async getByVersion(version: number): Promise<ScenarioGraphVersionData> {
    const [row] = await this.db
      .select()
      .from(scScenarioGraphVersions)
      .where(eq(scScenarioGraphVersions.version, version));
    if (!row) {
      throw new NotFoundError("ScenarioGraph", `v${String(version)}`);
    }
    return row as unknown as ScenarioGraphVersionData;
  }

  async listVersions(
    limit = 20,
    offset = 0
  ): Promise<{ data: ScenarioGraphVersionData[]; total: number }> {
    const [countRow] = await this.db
      .select({ total: count() })
      .from(scScenarioGraphVersions);

    const rows = await this.db
      .select()
      .from(scScenarioGraphVersions)
      .orderBy(desc(scScenarioGraphVersions.version))
      .limit(limit)
      .offset(offset);

    return {
      data: rows as unknown as ScenarioGraphVersionData[],
      total: countRow?.total ?? 0,
    };
  }

  async buildSnapshot(): Promise<GraphSnapshot> {
    // Fetch all non-archived scenario types with their relations
    const scenarioTypes = await this.db.select().from(scScenarioTypes);

    const failureModes = await this.db.select().from(scFailureModes);
    const riskTiers = await this.db.select().from(scRiskTiers);
    const contextProfiles = await this.db.select().from(scContextProfiles);

    // Fetch all join table data
    const fmJoins = await this.db.select().from(scScenarioTypeFailureModes);
    const cpJoins = await this.db.select().from(scScenarioTypeContextProfiles);

    // Fetch rubric IDs per scenario type
    const rubrics = await this.db
      .select({ id: scRubrics.id, scenarioTypeId: scRubrics.scenarioTypeId })
      .from(scRubrics);

    // Build lookup maps
    const riskTierMap = new Map(riskTiers.map((rt) => [rt.id, rt]));
    const fmMap = new Map(failureModes.map((fm) => [fm.id, fm]));
    const cpMap = new Map(contextProfiles.map((cp) => [cp.id, cp]));

    return {
      scenarioTypes: scenarioTypes.map((st) => {
        const rt = riskTierMap.get(st.riskTierId);
        const stFmIds = fmJoins
          .filter((j) => j.scenarioTypeId === st.id)
          .map((j) => j.failureModeId);
        const stCpIds = cpJoins
          .filter((j) => j.scenarioTypeId === st.id)
          .map((j) => j.contextProfileId);
        const stRubricIds = rubrics
          .filter((r) => r.scenarioTypeId === st.id)
          .map((r) => r.id);

        return {
          id: st.id,
          name: st.name,
          description: st.description,
          parentId: st.parentId,
          archived: st.archived,
          riskTier: rt
            ? {
                id: rt.id,
                name: rt.name,
                weight: rt.weight,
                category: rt.category,
              }
            : {
                id: st.riskTierId,
                name: "unknown",
                weight: 0,
                category: "business",
              },
          failureModes: stFmIds
            .map((fmId) => fmMap.get(fmId))
            .filter(Boolean)
            .map((fm) => ({
              id: fm!.id,
              name: fm!.name,
              description: fm!.description,
              severity: fm!.severity,
            })),
          contextProfiles: stCpIds
            .map((cpId) => cpMap.get(cpId))
            .filter(Boolean)
            .map((cp) => ({
              id: cp!.id,
              name: cp!.name,
              attributes: cp!.attributes as Record<string, unknown>,
            })),
          rubricIds: stRubricIds,
        };
      }),
      failureModes: failureModes.map((fm) => ({
        id: fm.id,
        name: fm.name,
        description: fm.description,
        severity: fm.severity,
      })),
      riskTiers: riskTiers.map((rt) => ({
        id: rt.id,
        name: rt.name,
        weight: rt.weight,
        category: rt.category,
      })),
      contextProfiles: contextProfiles.map((cp) => ({
        id: cp.id,
        name: cp.name,
        attributes: cp.attributes as Record<string, unknown>,
      })),
    };
  }
}
