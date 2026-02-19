import type { UUID } from "@/shared/types";

export interface RubricCriterion {
  name: string;
  description: string;
  weight: number;
}

export interface RubricExample {
  input: string;
  expectedOutput: string;
  explanation: string;
}

export interface RubricData {
  id: UUID;
  scenarioTypeId: UUID;
  version: number;
  criteria: RubricCriterion[];
  examples: RubricExample[];
  createdAt: Date;
}

export type CreateRubricInput = {
  scenarioTypeId: string;
  criteria: RubricCriterion[];
  examples?: RubricExample[];
};
