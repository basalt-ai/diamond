import type { DomainEvent } from "./DomainEvent";
import type { EventPublisher } from "./EventPublisher";
import type { EventHandler, EventSubscriber } from "./EventSubscriber";

export class InProcessEventBus implements EventPublisher, EventSubscriber {
  private handlers = new Map<string, Set<EventHandler>>();

  subscribe(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(
          `[EventBus] Handler failed for ${event.eventType}:`,
          error
        );
      }
    }
  }

  async publishAll(events: ReadonlyArray<DomainEvent>): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}

export const eventBus = new InProcessEventBus();
