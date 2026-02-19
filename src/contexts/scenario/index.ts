import { db } from "@/db";

import { GraphVersioningService } from "./application/GraphVersioningService";
import { ManageContextProfiles } from "./application/use-cases/ManageContextProfiles";
import { ManageFailureModes } from "./application/use-cases/ManageFailureModes";
import { ManageRiskTiers } from "./application/use-cases/ManageRiskTiers";
import { ManageRubrics } from "./application/use-cases/ManageRubrics";
import { ManageScenarioTypes } from "./application/use-cases/ManageScenarioTypes";
import { ReadScenarioGraph } from "./application/use-cases/ReadScenarioGraph";
import { DrizzleGraphRepository } from "./infrastructure/DrizzleGraphRepository";
import { DrizzleRubricRepository } from "./infrastructure/DrizzleRubricRepository";
import { DrizzleScenarioRepository } from "./infrastructure/DrizzleScenarioRepository";

const scenarioRepo = new DrizzleScenarioRepository(db);
const rubricRepo = new DrizzleRubricRepository(db);
const graphRepo = new DrizzleGraphRepository(db);
const graphVersioning = new GraphVersioningService(graphRepo);

export const manageFailureModes = new ManageFailureModes(
  scenarioRepo,
  graphVersioning
);
export const manageRiskTiers = new ManageRiskTiers(
  scenarioRepo,
  graphVersioning
);
export const manageContextProfiles = new ManageContextProfiles(
  scenarioRepo,
  graphVersioning
);
export const manageScenarioTypes = new ManageScenarioTypes(
  scenarioRepo,
  graphVersioning
);
export const manageRubrics = new ManageRubrics(rubricRepo, scenarioRepo);
export const readScenarioGraph = new ReadScenarioGraph(graphRepo);
