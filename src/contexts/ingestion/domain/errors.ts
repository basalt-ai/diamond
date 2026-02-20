import {
  DomainError,
  InvalidStateTransitionError,
  NotFoundError,
} from "@/lib/domain/DomainError";

export class EpisodeNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("Episode", id);
    this.name = "EpisodeNotFoundError";
  }
}

export class PIIRedactionFailedError extends DomainError {
  constructor(message: string) {
    super(`PII redaction failed: ${message}`, "PII_REDACTION_FAILED");
    this.name = "PIIRedactionFailedError";
  }
}

export class ConnectorNotFoundError extends DomainError {
  constructor(source: string) {
    super(
      `No connector registered for source "${source}"`,
      "CONNECTOR_NOT_FOUND"
    );
    this.name = "ConnectorNotFoundError";
  }
}

export class BulkSourceNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("BulkSource", id);
    this.name = "BulkSourceNotFoundError";
  }
}

export class InvalidBulkSourceStateError extends InvalidStateTransitionError {
  constructor(from: string, to: string) {
    super("BulkSource", from, to);
    this.name = "InvalidBulkSourceStateError";
  }
}

export class MappingValidationError extends DomainError {
  constructor(message: string) {
    super(message, "MAPPING_VALIDATION_ERROR");
    this.name = "MappingValidationError";
  }
}

export class SchemaDiscoveryError extends DomainError {
  constructor(message: string) {
    super(`Schema discovery failed: ${message}`, "SCHEMA_DISCOVERY_ERROR");
    this.name = "SchemaDiscoveryError";
  }
}
