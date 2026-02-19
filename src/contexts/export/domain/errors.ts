import { DomainError } from "@/lib/domain/DomainError";

export class ExportNotReleasedError extends DomainError {
  constructor(datasetVersionId: string) {
    super(
      `DatasetVersion ${datasetVersionId} is not in released state`,
      "EXPORT_NOT_RELEASED"
    );
    this.name = "ExportNotReleasedError";
  }
}
