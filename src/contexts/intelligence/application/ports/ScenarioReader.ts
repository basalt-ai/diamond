import type { UUID } from "@/shared/types";

export interface ScenarioTypeSnapshot {
  id: UUID;
  name: string;
  riskTier: string;
}

export interface ScenarioReader {
  findAllTypes(): Promise<ScenarioTypeSnapshot[]>;
  findTypeById(id: UUID): Promise<ScenarioTypeSnapshot | null>;
}
