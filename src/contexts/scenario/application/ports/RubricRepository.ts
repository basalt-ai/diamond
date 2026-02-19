import type { UUID } from "@/shared/types";

import type {
  CreateRubricInput,
  RubricData,
} from "../../domain/entities/Rubric";

export interface RubricRepository {
  createVersion(input: CreateRubricInput): Promise<RubricData>;
  getLatest(scenarioTypeId: UUID): Promise<RubricData>;
  getByVersion(scenarioTypeId: UUID, version: number): Promise<RubricData>;
  listVersions(scenarioTypeId: UUID): Promise<RubricData[]>;
  getById(id: UUID): Promise<RubricData>;
}
