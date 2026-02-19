export interface DomainEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;
}

export type TypedDomainEvent<
  T extends string,
  P extends Record<string, unknown>,
> = DomainEvent & {
  readonly eventType: T;
  readonly payload: P;
};
