import { db } from "@/db";
import { createArtifactStore } from "@/lib/storage";

import { ManageBulkSources } from "./application/use-cases/ManageBulkSources";
import { ManageEpisodes } from "./application/use-cases/ManageEpisodes";
import { ConnectorRegistry } from "./infrastructure/connectors/ConnectorRegistry";
import { GenericJsonConnector } from "./infrastructure/connectors/GenericJsonConnector";
import { DrizzleBulkSourceRepository } from "./infrastructure/DrizzleBulkSourceRepository";
import { DrizzleEpisodeRepository } from "./infrastructure/DrizzleEpisodeRepository";
import { DuckDBTabularDataSource } from "./infrastructure/DuckDBTabularDataSource";
import { RegexPIIRedactor } from "./infrastructure/RegexPIIRedactor";

const episodeRepo = new DrizzleEpisodeRepository(db);
const bulkSourceRepo = new DrizzleBulkSourceRepository(db);
const artifactStore = createArtifactStore({ keyPrefix: "ingestion" });
const piiRedactor = new RegexPIIRedactor();
const connectorRegistry = new ConnectorRegistry();
connectorRegistry.register(new GenericJsonConnector());
const tabularDataSource = new DuckDBTabularDataSource();

export const manageEpisodes = new ManageEpisodes(
  episodeRepo,
  artifactStore,
  piiRedactor,
  connectorRegistry
);

export const manageBulkSources = new ManageBulkSources(
  bulkSourceRepo,
  tabularDataSource,
  manageEpisodes
);
