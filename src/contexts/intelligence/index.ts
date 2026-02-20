import { db } from "@/db";

import { ManageScoringRuns } from "./application/use-cases/ManageScoringRuns";
import { ManageSelectionRuns } from "./application/use-cases/ManageSelectionRuns";
import { DrizzleEmbeddingRepository } from "./infrastructure/DrizzleEmbeddingRepository";
import { DrizzleScoringRunRepository } from "./infrastructure/DrizzleScoringRunRepository";
import { DrizzleSelectionRunRepository } from "./infrastructure/DrizzleSelectionRunRepository";
import { OpenAIEmbeddingProvider } from "./infrastructure/OpenAIEmbeddingProvider";
import { PgVectorRedundancyOracle } from "./infrastructure/PgVectorRedundancyOracle";

// Repositories
const embeddingRepo = new DrizzleEmbeddingRepository(db);
const scoringRunRepo = new DrizzleScoringRunRepository(db);
const selectionRunRepo = new DrizzleSelectionRunRepository(db);

// Infrastructure adapters
const embeddingProvider = new OpenAIEmbeddingProvider();
const redundancyOracle = new PgVectorRedundancyOracle(db);

// Use cases
export const manageScoringRuns = new ManageScoringRuns(scoringRunRepo);
export const manageSelectionRuns = new ManageSelectionRuns(selectionRunRepo);

export {
  embeddingRepo,
  embeddingProvider,
  scoringRunRepo,
  selectionRunRepo,
  redundancyOracle,
};
