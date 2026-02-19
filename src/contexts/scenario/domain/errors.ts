import { DomainError } from "@/lib/domain/DomainError";

export class CycleDetectedError extends DomainError {
  constructor(nodeId: string, parentId: string) {
    super(
      `Setting parent ${parentId} on node ${nodeId} would create a cycle`,
      "CYCLE_DETECTED"
    );
    this.name = "CycleDetectedError";
  }
}

export class ReferenceIntegrityError extends DomainError {
  constructor(entity: string, id: string, referencedBy: string) {
    super(
      `Cannot delete ${entity} ${id}: still referenced by ${referencedBy}`,
      "REFERENCE_INTEGRITY"
    );
    this.name = "ReferenceIntegrityError";
  }
}

export class ConcurrencyConflictError extends DomainError {
  constructor(expectedVersion: number, actualVersion: number) {
    super(
      `Concurrency conflict: expected version ${expectedVersion}, actual ${actualVersion}`,
      "CONCURRENCY_CONFLICT"
    );
    this.name = "ConcurrencyConflictError";
  }
}
