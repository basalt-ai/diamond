import { db } from "@/db";

import { ManageCandidates } from "./application/use-cases/ManageCandidates";
import { DrizzleCandidateRepository } from "./infrastructure/DrizzleCandidateRepository";
import { ScenarioContextAdapter } from "./infrastructure/ScenarioContextAdapter";

const candidateRepo = new DrizzleCandidateRepository(db);
const scenarioReader = new ScenarioContextAdapter();

export const manageCandidates = new ManageCandidates(
  candidateRepo,
  scenarioReader
);
