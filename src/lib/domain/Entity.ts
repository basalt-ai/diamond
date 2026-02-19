import type { UUID } from "@/shared/types";

export abstract class Entity {
  constructor(public readonly id: UUID) {}

  equals(other: Entity): boolean {
    return this.id === other.id;
  }
}
