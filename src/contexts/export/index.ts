import { db } from "@/db";
import { createArtifactStore } from "@/lib/storage";

import { ManageExports } from "./application/use-cases/ManageExports";
import { CandidateContextAdapter } from "./infrastructure/CandidateContextAdapter";
import { DatasetContextAdapter } from "./infrastructure/DatasetContextAdapter";
import { DrizzleExportJobRepository } from "./infrastructure/DrizzleExportJobRepository";
import { JsonlSerializer } from "./infrastructure/JsonlSerializer";
import { LabelContextAdapter } from "./infrastructure/LabelContextAdapter";

const exportJobRepo = new DrizzleExportJobRepository(db);
const datasetVersionReader = new DatasetContextAdapter();
const candidateDataReader = new CandidateContextAdapter();
const labelDataReader = new LabelContextAdapter();
const artifactStore = createArtifactStore({ keyPrefix: "exports" });
const jsonlSerializer = new JsonlSerializer();

export const manageExports = new ManageExports(
  exportJobRepo,
  datasetVersionReader,
  candidateDataReader,
  labelDataReader,
  artifactStore,
  { jsonl: jsonlSerializer }
);
