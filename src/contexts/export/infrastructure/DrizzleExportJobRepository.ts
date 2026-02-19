import { and, count, desc, eq } from "drizzle-orm";

import type { Database } from "@/db";
import { exExportJobs } from "@/db/schema/export";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import type {
  ExportJobRepository,
  ListExportJobsFilter,
  ListExportJobsResult,
} from "../application/ports/ExportJobRepository";
import type { ExportJobData } from "../domain/entities/ExportJob";
import type { ExportFormat } from "../domain/value-objects/ExportFormat";

export class DrizzleExportJobRepository implements ExportJobRepository {
  constructor(private readonly db: Database) {}

  async create(data: ExportJobData): Promise<ExportJobData> {
    const id = data.id || generateId();
    const [row] = await this.db
      .insert(exExportJobs)
      .values({
        id,
        datasetVersionId: data.datasetVersionId,
        format: data.format,
        state: data.state,
        metadata: data.metadata,
      })
      .returning();
    return row as unknown as ExportJobData;
  }

  async findById(id: UUID): Promise<ExportJobData | null> {
    const [row] = await this.db
      .select()
      .from(exExportJobs)
      .where(eq(exExportJobs.id, id));
    return (row as unknown as ExportJobData) ?? null;
  }

  async findByVersionAndFormat(
    datasetVersionId: UUID,
    format: ExportFormat
  ): Promise<ExportJobData | null> {
    const [row] = await this.db
      .select()
      .from(exExportJobs)
      .where(
        and(
          eq(exExportJobs.datasetVersionId, datasetVersionId),
          eq(exExportJobs.format, format)
        )
      );
    return (row as unknown as ExportJobData) ?? null;
  }

  async update(data: ExportJobData): Promise<ExportJobData> {
    const [row] = await this.db
      .update(exExportJobs)
      .set({
        state: data.state,
        artifactPath: data.artifactPath,
        artifactSizeBytes: data.artifactSizeBytes,
        artifactChecksum: data.artifactChecksum,
        rowCount: data.rowCount,
        metadata: data.metadata,
        errorMessage: data.errorMessage,
        updatedAt: data.updatedAt,
        completedAt: data.completedAt,
      })
      .where(eq(exExportJobs.id, data.id))
      .returning();
    return row as unknown as ExportJobData;
  }

  async list(
    filter: ListExportJobsFilter,
    page: number,
    pageSize: number
  ): Promise<ListExportJobsResult> {
    const conditions = [];

    if (filter.datasetVersionId) {
      conditions.push(
        eq(exExportJobs.datasetVersionId, filter.datasetVersionId)
      );
    }
    if (filter.format) {
      conditions.push(eq(exExportJobs.format, filter.format));
    }
    if (filter.state) {
      conditions.push(eq(exExportJobs.state, filter.state));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(exExportJobs)
      .where(where);
    const total = totalResult?.value ?? 0;

    const offset = (page - 1) * pageSize;
    const rows = await this.db
      .select()
      .from(exExportJobs)
      .where(where)
      .orderBy(desc(exExportJobs.createdAt))
      .limit(pageSize)
      .offset(offset);

    return { data: rows as unknown as ExportJobData[], total };
  }

  async delete(id: UUID): Promise<void> {
    await this.db.delete(exExportJobs).where(eq(exExportJobs.id, id));
  }
}
