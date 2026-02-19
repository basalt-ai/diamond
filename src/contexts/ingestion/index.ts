import { db } from "@/db";
import { createArtifactStore } from "@/lib/storage";

import { ManageEpisodes } from "./application/use-cases/ManageEpisodes";
import { ConnectorRegistry } from "./infrastructure/connectors/ConnectorRegistry";
import { GenericJsonConnector } from "./infrastructure/connectors/GenericJsonConnector";
import { DrizzleEpisodeRepository } from "./infrastructure/DrizzleEpisodeRepository";
import { RegexPIIRedactor } from "./infrastructure/RegexPIIRedactor";

const episodeRepo = new DrizzleEpisodeRepository(db);
const artifactStore = createArtifactStore({ keyPrefix: "ingestion" });
const piiRedactor = new RegexPIIRedactor();
const connectorRegistry = new ConnectorRegistry();
connectorRegistry.register(new GenericJsonConnector());

export const manageEpisodes = new ManageEpisodes(
  episodeRepo,
  artifactStore,
  piiRedactor,
  connectorRegistry
);
