import { db } from "@/db";

import { ManageEpisodes } from "./application/use-cases/ManageEpisodes";
import { ConnectorRegistry } from "./infrastructure/connectors/ConnectorRegistry";
import { GenericJsonConnector } from "./infrastructure/connectors/GenericJsonConnector";
import { DrizzleEpisodeRepository } from "./infrastructure/DrizzleEpisodeRepository";
import { LocalFilesystemArtifactStore } from "./infrastructure/LocalFilesystemArtifactStore";
import { RegexPIIRedactor } from "./infrastructure/RegexPIIRedactor";

const episodeRepo = new DrizzleEpisodeRepository(db);
const artifactStore = new LocalFilesystemArtifactStore();
const piiRedactor = new RegexPIIRedactor();
const connectorRegistry = new ConnectorRegistry();
connectorRegistry.register(new GenericJsonConnector());

export const manageEpisodes = new ManageEpisodes(
  episodeRepo,
  artifactStore,
  piiRedactor,
  connectorRegistry
);
