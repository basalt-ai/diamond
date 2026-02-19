import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import type { DomainEvent } from "../events/DomainEvent";
import { Entity } from "./Entity";

export abstract class AggregateRoot extends Entity {
  private _domainEvents: DomainEvent[] = [];

  constructor(id: UUID) {
    super(id);
  }

  protected addDomainEvent(
    eventType: string,
    payload: Record<string, unknown>
  ): void {
    this._domainEvents.push({
      eventId: generateId(),
      eventType,
      aggregateId: this.id,
      occurredAt: new Date(),
      payload,
    });
  }

  get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }

  clearEvents(): void {
    this._domainEvents = [];
  }
}
