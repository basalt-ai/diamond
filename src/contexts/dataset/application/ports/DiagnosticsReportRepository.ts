import type { UUID } from "@/shared/types";

export interface DiagnosticsReportRow {
  id: UUID;
  datasetVersionId: UUID;
  metrics: unknown;
  gateResults: unknown;
  summary: unknown;
  createdAt: Date;
}

export interface DiagnosticsReportRepository {
  create(params: {
    id: UUID;
    datasetVersionId: UUID;
    metrics: unknown;
    gateResults: unknown;
    summary: unknown;
  }): Promise<DiagnosticsReportRow>;
  findByVersionId(versionId: UUID): Promise<DiagnosticsReportRow | null>;
}
