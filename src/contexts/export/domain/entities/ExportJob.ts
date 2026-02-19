import { AggregateRoot } from "@/lib/domain/AggregateRoot";
import { InvalidStateTransitionError } from "@/lib/domain/DomainError";
import type { UUID } from "@/shared/types";

import type { ExportFormat } from "../value-objects/ExportFormat";

export const EXPORT_JOB_STATES = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const;
export type ExportJobState = (typeof EXPORT_JOB_STATES)[number];

const VALID_TRANSITIONS: Record<ExportJobState, ExportJobState[]> = {
  pending: ["processing"],
  processing: ["completed", "failed"],
  completed: [],
  failed: [],
};

export interface ExportJobData {
  id: UUID;
  datasetVersionId: UUID;
  format: ExportFormat;
  state: ExportJobState;
  artifactPath: string | null;
  artifactSizeBytes: number | null;
  artifactChecksum: string | null;
  rowCount: number | null;
  metadata: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export class ExportJob extends AggregateRoot {
  private _datasetVersionId: UUID;
  private _format: ExportFormat;
  private _state: ExportJobState;
  private _artifactPath: string | null;
  private _artifactSizeBytes: number | null;
  private _artifactChecksum: string | null;
  private _rowCount: number | null;
  private _metadata: Record<string, unknown>;
  private _errorMessage: string | null;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _completedAt: Date | null;

  constructor(data: ExportJobData) {
    super(data.id);
    this._datasetVersionId = data.datasetVersionId;
    this._format = data.format;
    this._state = data.state;
    this._artifactPath = data.artifactPath;
    this._artifactSizeBytes = data.artifactSizeBytes;
    this._artifactChecksum = data.artifactChecksum;
    this._rowCount = data.rowCount;
    this._metadata = data.metadata;
    this._errorMessage = data.errorMessage;
    this._createdAt = data.createdAt;
    this._updatedAt = data.updatedAt;
    this._completedAt = data.completedAt;
  }

  get datasetVersionId(): UUID {
    return this._datasetVersionId;
  }
  get format(): ExportFormat {
    return this._format;
  }
  get state(): ExportJobState {
    return this._state;
  }
  get artifactPath(): string | null {
    return this._artifactPath;
  }
  get artifactSizeBytes(): number | null {
    return this._artifactSizeBytes;
  }
  get artifactChecksum(): string | null {
    return this._artifactChecksum;
  }
  get rowCount(): number | null {
    return this._rowCount;
  }
  get metadata(): Record<string, unknown> {
    return this._metadata;
  }
  get errorMessage(): string | null {
    return this._errorMessage;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get completedAt(): Date | null {
    return this._completedAt;
  }

  private transitionTo(targetState: ExportJobState): void {
    const allowed = VALID_TRANSITIONS[this._state];
    if (!allowed.includes(targetState)) {
      throw new InvalidStateTransitionError(
        "ExportJob",
        this._state,
        targetState
      );
    }
    this._state = targetState;
    this._updatedAt = new Date();
  }

  startProcessing(): void {
    this.transitionTo("processing");
  }

  complete(artifact: {
    path: string;
    sizeBytes: number;
    checksum: string;
    rowCount: number;
    metadata: Record<string, unknown>;
  }): void {
    this.transitionTo("completed");
    this._artifactPath = artifact.path;
    this._artifactSizeBytes = artifact.sizeBytes;
    this._artifactChecksum = artifact.checksum;
    this._rowCount = artifact.rowCount;
    this._metadata = artifact.metadata;
    this._completedAt = new Date();

    this.addDomainEvent("export.completed", {
      export_job_id: this.id,
      dataset_version_id: this._datasetVersionId,
      format: this._format,
      artifact_path: artifact.path,
      row_count: artifact.rowCount,
      checksum: artifact.checksum,
    });
  }

  fail(errorMessage: string): void {
    this.transitionTo("failed");
    this._errorMessage = errorMessage;

    this.addDomainEvent("export.failed", {
      export_job_id: this.id,
      dataset_version_id: this._datasetVersionId,
      format: this._format,
      error_message: errorMessage,
    });
  }

  toData(): ExportJobData {
    return {
      id: this.id,
      datasetVersionId: this._datasetVersionId,
      format: this._format,
      state: this._state,
      artifactPath: this._artifactPath,
      artifactSizeBytes: this._artifactSizeBytes,
      artifactChecksum: this._artifactChecksum,
      rowCount: this._rowCount,
      metadata: this._metadata,
      errorMessage: this._errorMessage,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      completedAt: this._completedAt,
    };
  }
}
