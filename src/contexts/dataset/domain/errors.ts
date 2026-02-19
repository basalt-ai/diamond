import { DomainError } from "@/lib/domain/DomainError";

export class DatasetImmutableError extends DomainError {
  constructor(id: string) {
    super(
      `DatasetVersion ${id} is released and cannot be modified`,
      "DATASET_IMMUTABLE"
    );
    this.name = "DatasetImmutableError";
  }
}
