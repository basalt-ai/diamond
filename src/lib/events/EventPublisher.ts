import type { DomainEvent } from "./DomainEvent";

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: ReadonlyArray<DomainEvent>): Promise<void>;
}
