import { and, count, desc, eq, gte, lte } from "drizzle-orm";

import type { Database } from "@/db";
import { igBulkSources } from "@/db/schema/ingestion";
import { DomainError } from "@/lib/domain/DomainError";
import type { UUID } from "@/shared/types";

import type {
  BulkSourceRepository,
  ListBulkSourcesFilter,
  ListBulkSourcesResult,
} from "../application/ports/BulkSourceRepository";
import type { BulkSourceData } from "../domain/entities/BulkSource";

export class DrizzleBulkSourceRepository implements BulkSourceRepository {
  constructor(private readonly db: Database) {}

  async insert(
    data: Omit<BulkSourceData, "createdAt" | "updatedAt">
  ): Promise<BulkSourceData> {
    const [row] = await this.db
      .insert(igBulkSources)
      .values({
        id: data.id,
        name: data.name,
        uri: data.uri,
        format: data.format,
        status: data.status,
        sourceLabel: data.sourceLabel,
        discoveredSchema: data.discoveredSchema,
        fieldMapping: data.fieldMapping,
        fileChecksum: data.fileChecksum,
        rowCount: data.rowCount,
        importProgress: data.importProgress,
        errorLog: data.errorLog,
      })
      .returning();
    return row as BulkSourceData;
  }

  async findById(id: UUID): Promise<BulkSourceData | null> {
    const [row] = await this.db
      .select()
      .from(igBulkSources)
      .where(eq(igBulkSources.id, id));
    return (row as BulkSourceData) ?? null;
  }

  async update(
    id: UUID,
    data: Partial<Omit<BulkSourceData, "id" | "createdAt" | "updatedAt">>,
    expectedUpdatedAt?: Date
  ): Promise<BulkSourceData> {
    const conditions = [eq(igBulkSources.id, id)];
    if (expectedUpdatedAt) {
      // JS Date has millisecond precision but Postgres timestamps have microsecond
      // precision. Use a 1ms window to account for the round-trip precision loss.
      const lo = new Date(expectedUpdatedAt.getTime());
      const hi = new Date(expectedUpdatedAt.getTime() + 1);
      conditions.push(gte(igBulkSources.updatedAt, lo));
      conditions.push(lte(igBulkSources.updatedAt, hi));
    }

    const rows = await this.db
      .update(igBulkSources)
      .set({ ...data, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();

    if (rows.length === 0) {
      if (expectedUpdatedAt) {
        throw new DomainError(
          "BulkSource was modified concurrently",
          "CONCURRENCY_CONFLICT"
        );
      }
      throw new DomainError("BulkSource not found", "NOT_FOUND");
    }

    return rows[0] as BulkSourceData;
  }

  async list(
    filter: ListBulkSourcesFilter,
    page: number,
    pageSize: number
  ): Promise<ListBulkSourcesResult> {
    const conditions = [];

    if (filter.status) {
      conditions.push(eq(igBulkSources.status, filter.status));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(igBulkSources)
      .where(where);
    const total = totalResult?.value ?? 0;

    const offset = (page - 1) * pageSize;
    const rows = await this.db
      .select()
      .from(igBulkSources)
      .where(where)
      .orderBy(desc(igBulkSources.createdAt))
      .limit(pageSize)
      .offset(offset);

    return { data: rows as BulkSourceData[], total };
  }
}
