import type { UUID } from "@/shared/types";

export interface RubricReader {
  getByIdAndVersion(
    rubricId: UUID,
    version: number
  ): Promise<{ id: UUID; version: number; criteria: unknown } | null>;

  getLatestVersion(
    rubricId: UUID
  ): Promise<{ id: UUID; version: number } | null>;

  getLatestForScenarioType(
    scenarioTypeId: UUID
  ): Promise<{ id: UUID; version: number } | null>;
}
