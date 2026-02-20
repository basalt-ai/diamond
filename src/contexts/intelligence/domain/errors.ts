import { DomainError } from "@/lib/domain/DomainError";

export class ScoringRunNotFoundError extends DomainError {
  constructor(id: string) {
    super(`ScoringRun ${id} not found`, "SCORING_RUN_NOT_FOUND");
    this.name = "ScoringRunNotFoundError";
  }
}

export class SelectionRunNotFoundError extends DomainError {
  constructor(id: string) {
    super(`SelectionRun ${id} not found`, "SELECTION_RUN_NOT_FOUND");
    this.name = "SelectionRunNotFoundError";
  }
}

export class EmbeddingNotFoundError extends DomainError {
  constructor(candidateId: string) {
    super(
      `Embedding not found for candidate ${candidateId}`,
      "EMBEDDING_NOT_FOUND"
    );
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

export class SpendCapExceededError extends DomainError {
  constructor() {
    super("Daily OpenAI token limit exceeded", "SPEND_CAP_EXCEEDED");
    this.name = "SpendCapExceededError";
  }
}
