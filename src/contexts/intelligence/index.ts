import { db } from "@/db";

import { InduceScenarios } from "./application/use-cases/InduceScenarios";
import { ManageClusteringRuns } from "./application/use-cases/ManageClusteringRuns";
import { ManageScoringRuns } from "./application/use-cases/ManageScoringRuns";
import { ManageSelectionRuns } from "./application/use-cases/ManageSelectionRuns";
import { CandidateContextAdapter } from "./infrastructure/adapters/CandidateContextAdapter";
import { IngestionContextAdapter } from "./infrastructure/adapters/IngestionContextAdapter";
import { ScenarioContextAdapter } from "./infrastructure/adapters/ScenarioContextAdapter";
import { DrizzleClusteringRunRepository } from "./infrastructure/DrizzleClusteringRunRepository";
import { DrizzleEmbeddingRepository } from "./infrastructure/DrizzleEmbeddingRepository";
import { DrizzleScoringRunRepository } from "./infrastructure/DrizzleScoringRunRepository";
import { DrizzleSelectionRunRepository } from "./infrastructure/DrizzleSelectionRunRepository";
import { EmbeddingScenarioMapper } from "./infrastructure/EmbeddingScenarioMapper";
import { HdbscanClusterDetector } from "./infrastructure/HdbscanClusterDetector";
import { LlmClusterSummarizer } from "./infrastructure/LlmClusterSummarizer";
import { OpenAIEmbeddingProvider } from "./infrastructure/OpenAIEmbeddingProvider";
import { PgVectorRedundancyOracle } from "./infrastructure/PgVectorRedundancyOracle";
import { SqlCoverageComputer } from "./infrastructure/SqlCoverageComputer";

// Repositories
const embeddingRepo = new DrizzleEmbeddingRepository(db);
const scoringRunRepo = new DrizzleScoringRunRepository(db);
const selectionRunRepo = new DrizzleSelectionRunRepository(db);
const clusteringRunRepo = new DrizzleClusteringRunRepository(db);

// Infrastructure adapters
const embeddingProvider = new OpenAIEmbeddingProvider();
const redundancyOracle = new PgVectorRedundancyOracle(db);
const coverageComputer = new SqlCoverageComputer(db);
const clusterDetector = new HdbscanClusterDetector(db);
const scenarioMapper = new EmbeddingScenarioMapper(db);
const episodeReader = new IngestionContextAdapter();
const scenarioTypeCreator = new ScenarioContextAdapter();
const candidateMapper = new CandidateContextAdapter(db);
const clusterSummarizer = process.env.OPENAI_API_KEY
  ? new LlmClusterSummarizer(db, episodeReader)
  : null;

// Use cases
export const manageScoringRuns = new ManageScoringRuns(scoringRunRepo);
export const manageSelectionRuns = new ManageSelectionRuns(selectionRunRepo);
export const manageClusteringRuns = new ManageClusteringRuns(
  clusteringRunRepo,
  clusterDetector,
  clusterSummarizer
);
export const induceScenarios = new InduceScenarios(
  clusteringRunRepo,
  scenarioTypeCreator,
  candidateMapper,
  scenarioMapper
);

export {
  embeddingRepo,
  embeddingProvider,
  scoringRunRepo,
  selectionRunRepo,
  clusteringRunRepo,
  redundancyOracle,
  coverageComputer,
  clusterDetector,
  scenarioMapper,
};
