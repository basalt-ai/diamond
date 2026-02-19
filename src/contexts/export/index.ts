import { db } from "@/db";

import { ManageExports } from "./application/use-cases/ManageExports";
import { CandidateContextAdapter } from "./infrastructure/CandidateContextAdapter";
import { DatasetContextAdapter } from "./infrastructure/DatasetContextAdapter";
import { DrizzleExportJobRepository } from "./infrastructure/DrizzleExportJobRepository";
import { JsonlSerializer } from "./infrastructure/JsonlSerializer";
import { LabelContextAdapter } from "./infrastructure/LabelContextAdapter";
import { LocalFilesystemArtifactStore } from "./infrastructure/LocalFilesystemArtifactStore";

const exportJobRepo = new DrizzleExportJobRepository(db);
const datasetVersionReader = new DatasetContextAdapter();
const candidateDataReader = new CandidateContextAdapter();
const labelDataReader = new LabelContextAdapter();
const artifactStore = new LocalFilesystemArtifactStore();
const jsonlSerializer = new JsonlSerializer();

export const manageExports = new ManageExports(
  exportJobRepo,
  datasetVersionReader,
  candidateDataReader,
  labelDataReader,
  artifactStore,
  { jsonl: jsonlSerializer }
);
