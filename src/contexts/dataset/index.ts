import { db } from "@/db";

import { ComputeVersionDiff } from "./application/use-cases/ComputeVersionDiff";
import { ManageDatasetSuites } from "./application/use-cases/ManageDatasetSuites";
import { ManageDatasetVersions } from "./application/use-cases/ManageDatasetVersions";
import { ManageReleaseGatePolicies } from "./application/use-cases/ManageReleaseGatePolicies";
import { RunDiagnostics } from "./application/use-cases/RunDiagnostics";
import { AgreementComputer } from "./domain/services/AgreementComputer";
import { RedundancyComputer } from "./domain/services/RedundancyComputer";
import { CandidateContextAdapter } from "./infrastructure/CandidateContextAdapter";
import { DrizzleDatasetSuiteRepository } from "./infrastructure/DrizzleDatasetSuiteRepository";
import { DrizzleDatasetVersionRepository } from "./infrastructure/DrizzleDatasetVersionRepository";
import { DrizzleDiagnosticsReportRepository } from "./infrastructure/DrizzleDiagnosticsReportRepository";
import { DrizzleReleaseGatePolicyRepository } from "./infrastructure/DrizzleReleaseGatePolicyRepository";
import { LabelContextAdapter } from "./infrastructure/LabelContextAdapter";
import { ScenarioContextAdapter } from "./infrastructure/ScenarioContextAdapter";

const suiteRepo = new DrizzleDatasetSuiteRepository(db);
const versionRepo = new DrizzleDatasetVersionRepository(db);
const candidateReader = new CandidateContextAdapter();
const scenarioReader = new ScenarioContextAdapter();
const labelReader = new LabelContextAdapter();
const diagnosticsRepo = new DrizzleDiagnosticsReportRepository(db);
const gatePolicyRepo = new DrizzleReleaseGatePolicyRepository(db);
const redundancyComputer = new RedundancyComputer();
const agreementComputer = new AgreementComputer();

export const manageDatasetSuites = new ManageDatasetSuites(suiteRepo);

export const manageDatasetVersions = new ManageDatasetVersions(
  versionRepo,
  suiteRepo,
  candidateReader,
  scenarioReader,
  labelReader
);

export const runDiagnostics = new RunDiagnostics(
  versionRepo,
  candidateReader,
  labelReader,
  diagnosticsRepo,
  redundancyComputer,
  agreementComputer
);

export const computeVersionDiff = new ComputeVersionDiff(versionRepo);

export const manageReleaseGatePolicies = new ManageReleaseGatePolicies(
  gatePolicyRepo,
  suiteRepo
);
