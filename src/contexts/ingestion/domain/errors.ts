import { DomainError, NotFoundError } from "@/lib/domain/DomainError";

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
