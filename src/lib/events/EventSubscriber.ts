import type { DomainEvent } from "./DomainEvent";

export type EventHandler<T extends DomainEvent = DomainEvent> = (
  event: T,
) => void | Promise<void>;

export interface EventSubscriber {
  subscribe(eventType: string, handler: EventHandler): void;
}
