import { and, count, desc, eq } from "drizzle-orm";

import type { Database } from "@/db";
import { dsDatasetVersions } from "@/db/schema/dataset";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import type {
  DatasetVersionRepository,
  ListVersionsFilter,
  ListVersionsResult,
} from "../application/ports/DatasetVersionRepository";
import type {
  DatasetVersionData,
  DatasetVersionState,
} from "../domain/entities/DatasetVersion";
import type { GateResult } from "../domain/value-objects/GateResult";
import type { LineageData } from "../domain/value-objects/Lineage";

export class DrizzleDatasetVersionRepository implements DatasetVersionRepository {
  constructor(private readonly db: Database) {}

  async create(params: {
    suiteId: UUID;
    version: string;
    scenarioGraphVersion: string;
    selectionPolicy: Record<string, unknown>;
    candidateIds: string[];
    lineage: LineageData | null;
  }): Promise<DatasetVersionData> {
    const id = generateId();
    const [row] = await this.db
      .insert(dsDatasetVersions)
      .values({
        id,
        suiteId: params.suiteId,
        version: params.version,
        scenarioGraphVersion: params.scenarioGraphVersion,
        selectionPolicy: params.selectionPolicy,
        candidateIds: params.candidateIds,
        lineage: params.lineage,
      })
      .returning();
    return row as unknown as DatasetVersionData;
  }

  async findById(id: UUID): Promise<DatasetVersionData | null> {
    const [row] = await this.db
      .select()
      .from(dsDatasetVersions)
      .where(eq(dsDatasetVersions.id, id));
    return (row as unknown as DatasetVersionData) ?? null;
  }

  async findBySuiteAndVersion(
    suiteId: UUID,
    version: string
  ): Promise<DatasetVersionData | null> {
    const [row] = await this.db
      .select()
      .from(dsDatasetVersions)
      .where(
        and(
          eq(dsDatasetVersions.suiteId, suiteId),
          eq(dsDatasetVersions.version, version)
        )
      );
    return (row as unknown as DatasetVersionData) ?? null;
  }

  async list(
    filter: ListVersionsFilter,
    page: number,
    pageSize: number
  ): Promise<ListVersionsResult> {
    const conditions = [];

    if (filter.suiteId) {
      conditions.push(eq(dsDatasetVersions.suiteId, filter.suiteId));
    }
    if (filter.state) {
      conditions.push(eq(dsDatasetVersions.state, filter.state));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(dsDatasetVersions)
      .where(where);
    const total = totalResult?.value ?? 0;

    const offset = (page - 1) * pageSize;
    const rows = await this.db
      .select()
      .from(dsDatasetVersions)
      .where(where)
      .orderBy(desc(dsDatasetVersions.createdAt))
      .limit(pageSize)
      .offset(offset);

    return { data: rows as unknown as DatasetVersionData[], total };
  }

  async updateState(
    id: UUID,
    state: DatasetVersionState,
    updatedAt: Date,
    releasedAt?: Date
  ): Promise<DatasetVersionData> {
    const [row] = await this.db
      .update(dsDatasetVersions)
      .set({
        state,
        updatedAt,
        ...(releasedAt !== undefined && { releasedAt }),
      })
      .where(eq(dsDatasetVersions.id, id))
      .returning();
    return row as unknown as DatasetVersionData;
  }

  async updateDiagnostics(
    id: UUID,
    diagnosticsId: UUID
  ): Promise<DatasetVersionData> {
    const [row] = await this.db
      .update(dsDatasetVersions)
      .set({ diagnosticsId, updatedAt: new Date() })
      .where(eq(dsDatasetVersions.id, id))
      .returning();
    return row as unknown as DatasetVersionData;
  }

  async updateGateResults(
    id: UUID,
    gateResults: GateResult[],
    state: DatasetVersionState,
    updatedAt: Date,
    releasedAt?: Date
  ): Promise<DatasetVersionData> {
    const [row] = await this.db
      .update(dsDatasetVersions)
      .set({
        gateResults,
        state,
        updatedAt,
        ...(releasedAt !== undefined && { releasedAt }),
      })
      .where(eq(dsDatasetVersions.id, id))
      .returning();
    return row as unknown as DatasetVersionData;
  }
}
