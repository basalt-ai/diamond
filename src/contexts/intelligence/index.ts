import { db } from "@/db";

import { ManageEmbeddings } from "./application/use-cases/ManageEmbeddings";
import { ManageScoringRuns } from "./application/use-cases/ManageScoringRuns";
import { DrizzleEmbeddingRepository } from "./infrastructure/DrizzleEmbeddingRepository";
import { DrizzleScoringRunRepository } from "./infrastructure/DrizzleScoringRunRepository";
import { OpenAIEmbeddingProvider } from "./infrastructure/OpenAIEmbeddingProvider";

// Repositories
const embeddingRepo = new DrizzleEmbeddingRepository(db);
const scoringRunRepo = new DrizzleScoringRunRepository(db);

// Infrastructure adapters
const embeddingProvider = new OpenAIEmbeddingProvider();

// Use cases
// Note: ManageEmbeddings needs an EpisodeReader adapter — will be wired when
// the IngestionContextAdapter is built. For now, exported partially.
export const manageScoringRuns = new ManageScoringRuns(scoringRunRepo);

export { embeddingRepo, embeddingProvider, scoringRunRepo };
