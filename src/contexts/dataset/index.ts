import { db } from "@/db";

import { ComputeDrift } from "./application/use-cases/ComputeDrift";
import { ComputeVersionDiff } from "./application/use-cases/ComputeVersionDiff";
import { ManageDatasetSuites } from "./application/use-cases/ManageDatasetSuites";
import { ManageRefreshPolicies } from "./application/use-cases/ManageRefreshPolicies";
import { ManageDatasetVersions } from "./application/use-cases/ManageDatasetVersions";
import { ManageEvalRuns } from "./application/use-cases/ManageEvalRuns";
import { ManageReleaseGatePolicies } from "./application/use-cases/ManageReleaseGatePolicies";
import { ManageSlices } from "./application/use-cases/ManageSlices";
import { RunDiagnostics } from "./application/use-cases/RunDiagnostics";
import { RunFailureAnalysis } from "./application/use-cases/RunFailureAnalysis";
import { AgreementComputer } from "./domain/services/AgreementComputer";
import { GateEvaluator } from "./domain/services/GateEvaluator";
import { RedundancyComputer } from "./domain/services/RedundancyComputer";
import { CandidateContextAdapter } from "./infrastructure/CandidateContextAdapter";
import { CandidateDistributionAdapter } from "./infrastructure/CandidateDistributionAdapter";
import { DrizzleDatasetSuiteRepository } from "./infrastructure/DrizzleDatasetSuiteRepository";
import { DrizzleDatasetVersionRepository } from "./infrastructure/DrizzleDatasetVersionRepository";
import { DrizzleDiagnosticsReportRepository } from "./infrastructure/DrizzleDiagnosticsReportRepository";
import { DrizzleEvalRunRepository } from "./infrastructure/DrizzleEvalRunRepository";
import { DrizzleReleaseGatePolicyRepository } from "./infrastructure/DrizzleReleaseGatePolicyRepository";
import { DrizzleSliceRepository } from "./infrastructure/DrizzleSliceRepository";
import { LabelContextAdapter } from "./infrastructure/LabelContextAdapter";
import { ScenarioContextAdapter } from "./infrastructure/ScenarioContextAdapter";

const suiteRepo = new DrizzleDatasetSuiteRepository(db);
const versionRepo = new DrizzleDatasetVersionRepository(db);
const candidateReader = new CandidateContextAdapter();
const scenarioReader = new ScenarioContextAdapter();
const labelReader = new LabelContextAdapter();
const diagnosticsRepo = new DrizzleDiagnosticsReportRepository(db);
const gatePolicyRepo = new DrizzleReleaseGatePolicyRepository(db);
const evalRunRepo = new DrizzleEvalRunRepository(db);
const sliceRepo = new DrizzleSliceRepository(db);
const distributionReader = new CandidateDistributionAdapter();
const redundancyComputer = new RedundancyComputer();
const agreementComputer = new AgreementComputer();
const gateEvaluator = new GateEvaluator();

export const manageDatasetSuites = new ManageDatasetSuites(suiteRepo);

export const manageRefreshPolicies = new ManageRefreshPolicies(suiteRepo);

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
  agreementComputer,
  gatePolicyRepo,
  gateEvaluator
);

export const computeVersionDiff = new ComputeVersionDiff(versionRepo);

export const computeDrift = new ComputeDrift(versionRepo, distributionReader);

export const manageReleaseGatePolicies = new ManageReleaseGatePolicies(
  gatePolicyRepo,
  suiteRepo
);

export const manageEvalRuns = new ManageEvalRuns(evalRunRepo, versionRepo);

export const manageSlices = new ManageSlices(sliceRepo);

export const runFailureAnalysis = new RunFailureAnalysis(
  evalRunRepo,
  versionRepo
);
