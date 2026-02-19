import type { UUID } from "@/shared/types";

import type {
  ExportJobData,
  ExportJobState,
} from "../../domain/entities/ExportJob";
import type { ExportFormat } from "../../domain/value-objects/ExportFormat";

export interface ListExportJobsFilter {
  datasetVersionId?: UUID;
  format?: ExportFormat;
  state?: ExportJobState;
}

export interface ListExportJobsResult {
  data: ExportJobData[];
  total: number;
}

export interface ExportJobRepository {
  create(data: ExportJobData): Promise<ExportJobData>;
  findById(id: UUID): Promise<ExportJobData | null>;
  findByVersionAndFormat(
    datasetVersionId: UUID,
    format: ExportFormat
  ): Promise<ExportJobData | null>;
  update(data: ExportJobData): Promise<ExportJobData>;
  list(
    filter: ListExportJobsFilter,
    page: number,
    pageSize: number
  ): Promise<ListExportJobsResult>;
  delete(id: UUID): Promise<void>;
}
