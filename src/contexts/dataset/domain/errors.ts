import {
  DomainError,
  DuplicateError,
  NotFoundError,
} from "@/lib/domain/DomainError";

export class DatasetImmutableError extends DomainError {
  constructor(id: string) {
    super(
      `DatasetVersion ${id} is released and cannot be modified`,
      "DATASET_IMMUTABLE"
    );
    this.name = "DatasetImmutableError";
  }
}

export class ReleaseGatePolicyNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("ReleaseGatePolicy", id);
    this.name = "ReleaseGatePolicyNotFoundError";
  }
}

export class DuplicateGatePolicyError extends DuplicateError {
  constructor(gateName: string) {
    super("ReleaseGatePolicy", "gate_name", gateName);
    this.name = "DuplicateGatePolicyError";
  }
}

export class EvalRunNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("EvalRun", id);
    this.name = "EvalRunNotFoundError";
  }
}

export class DuplicateEvalRunError extends DuplicateError {
  constructor(externalId: string) {
    super("EvalRun", "eval_run_external_id", externalId);
    this.name = "DuplicateEvalRunError";
  }
}

export class DatasetVersionNotReleasedError extends DomainError {
  constructor(id: string) {
    super(
      `DatasetVersion ${id} must be released to accept eval results`,
      "DATASET_VERSION_NOT_RELEASED"
    );
    this.name = "DatasetVersionNotReleasedError";
  }
}

export class InsufficientEvalRunsError extends DomainError {
  constructor(versionId: string, count: number) {
    super(
      `Need at least 2 eval runs with different model versions for failure analysis, found ${count} for version ${versionId}`,
      "INSUFFICIENT_EVAL_RUNS"
    );
    this.name = "InsufficientEvalRunsError";
  }
}

export class GoldenSliceImmutableError extends DomainError {
  constructor(sliceId: string) {
    super(
      `Golden slice ${sliceId} cannot be modified. Use force=true to unlock first.`,
      "GOLDEN_SLICE_IMMUTABLE"
    );
    this.name = "GoldenSliceImmutableError";
  }
}

export class EmptyDatasetVersionError extends DomainError {
  constructor(id: string) {
    super(`DatasetVersion ${id} has no candidates`, "EMPTY_DATASET_VERSION");
    this.name = "EmptyDatasetVersionError";
  }
}
