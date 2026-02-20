import { DomainError, NotFoundError } from "@/lib/domain/DomainError";

export class ScoringRunNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("ScoringRun", id);
    this.name = "ScoringRunNotFoundError";
  }
}

export class SelectionRunNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("SelectionRun", id);
    this.name = "SelectionRunNotFoundError";
  }
}

export class EmbeddingNotFoundError extends NotFoundError {
  constructor(candidateId: string) {
    super("Embedding", candidateId);
    this.name = "EmbeddingNotFoundError";
  }
}

export class PIIRedactionRequiredError extends DomainError {
  constructor(candidateId: string) {
    super(
      `Candidate ${candidateId} has unredacted PII — cannot embed`,
      "PII_REDACTION_REQUIRED"
    );
    this.name = "PIIRedactionRequiredError";
  }
}

export class ClusteringRunNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("ClusteringRun", id);
    this.name = "ClusteringRunNotFoundError";
  }
}

export class InsufficientDataError extends DomainError {
  constructor(actual: number, required: number) {
    super(
      `Insufficient data for clustering: ${actual} embeddings (need at least ${required})`,
      "INSUFFICIENT_DATA"
    );
    this.name = "InsufficientDataError";
  }
}

export class SpendCapExceededError extends DomainError {
  constructor() {
    super("Daily OpenAI token limit exceeded", "SPEND_CAP_EXCEEDED");
    this.name = "SpendCapExceededError";
  }
}
