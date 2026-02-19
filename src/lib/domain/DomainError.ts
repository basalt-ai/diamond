export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} not found`, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class InvalidStateTransitionError extends DomainError {
  constructor(entity: string, from: string, to: string) {
    super(
      `Cannot transition ${entity} from ${from} to ${to}`,
      "INVALID_STATE_TRANSITION"
    );
    this.name = "InvalidStateTransitionError";
  }
}

export class DuplicateError extends DomainError {
  constructor(entity: string, field: string, value: string) {
    super(`${entity} with ${field} "${value}" already exists`, "DUPLICATE");
    this.name = "DuplicateError";
  }
}
