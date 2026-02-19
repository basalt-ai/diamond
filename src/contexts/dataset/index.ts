import { db } from "@/db";

import { ComputeVersionDiff } from "./application/use-cases/ComputeVersionDiff";
import { ManageDatasetSuites } from "./application/use-cases/ManageDatasetSuites";
import { ManageDatasetVersions } from "./application/use-cases/ManageDatasetVersions";
import { RunDiagnostics } from "./application/use-cases/RunDiagnostics";
import { CandidateContextAdapter } from "./infrastructure/CandidateContextAdapter";
import { DrizzleDatasetSuiteRepository } from "./infrastructure/DrizzleDatasetSuiteRepository";
import { DrizzleDatasetVersionRepository } from "./infrastructure/DrizzleDatasetVersionRepository";
import { LabelContextAdapter } from "./infrastructure/LabelContextAdapter";
import { ScenarioContextAdapter } from "./infrastructure/ScenarioContextAdapter";

const suiteRepo = new DrizzleDatasetSuiteRepository(db);
const versionRepo = new DrizzleDatasetVersionRepository(db);
const candidateReader = new CandidateContextAdapter();
const scenarioReader = new ScenarioContextAdapter();
const labelReader = new LabelContextAdapter();

export const manageDatasetSuites = new ManageDatasetSuites(suiteRepo);

export const manageDatasetVersions = new ManageDatasetVersions(
  versionRepo,
  suiteRepo,
  candidateReader,
  scenarioReader,
  labelReader
);

export const runDiagnostics = new RunDiagnostics(
  db,
  versionRepo,
  candidateReader,
  labelReader
);

export const computeVersionDiff = new ComputeVersionDiff(versionRepo);
