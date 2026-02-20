import { eq } from "drizzle-orm";

import type { Database } from "@/db";
import { dsDiagnosticsReports } from "@/db/schema/dataset";
import type { UUID } from "@/shared/types";

import type {
  DiagnosticsReportRepository,
  DiagnosticsReportRow,
} from "../application/ports/DiagnosticsReportRepository";

export class DrizzleDiagnosticsReportRepository implements DiagnosticsReportRepository {
  constructor(private readonly db: Database) {}

  async create(params: {
    id: UUID;
    datasetVersionId: UUID;
    metrics: unknown;
    gateResults: unknown;
    summary: unknown;
  }): Promise<DiagnosticsReportRow> {
    const [row] = await this.db
      .insert(dsDiagnosticsReports)
      .values({
        id: params.id,
        datasetVersionId: params.datasetVersionId,
        metrics: params.metrics,
        gateResults: params.gateResults,
        summary: params.summary,
      })
      .returning();
    return row as unknown as DiagnosticsReportRow;
  }

  async findByVersionId(versionId: UUID): Promise<DiagnosticsReportRow | null> {
    const [row] = await this.db
      .select()
      .from(dsDiagnosticsReports)
      .where(eq(dsDiagnosticsReports.datasetVersionId, versionId));
    return (row as unknown as DiagnosticsReportRow) ?? null;
  }
}
