import type { TypedDomainEvent } from "@/lib/events/DomainEvent";

export type ExportCompletedPayload = {
  export_job_id: string;
  dataset_version_id: string;
  format: string;
  artifact_path: string;
  row_count: number;
  checksum: string;
};

export type ExportCompletedEvent = TypedDomainEvent<
  "export.completed",
  ExportCompletedPayload
>;

export type ExportFailedPayload = {
  export_job_id: string;
  dataset_version_id: string;
  format: string;
  error_message: string;
};

export type ExportFailedEvent = TypedDomainEvent<
  "export.failed",
  ExportFailedPayload
>;
