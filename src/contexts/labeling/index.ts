import { db } from "@/db";

import { ManageLabels } from "./application/use-cases/ManageLabels";
import { ManageLabelTasks } from "./application/use-cases/ManageLabelTasks";
import { CandidateContextAdapter } from "./infrastructure/CandidateContextAdapter";
import { DrizzleLabelRepository } from "./infrastructure/DrizzleLabelRepository";
import { DrizzleLabelTaskRepository } from "./infrastructure/DrizzleLabelTaskRepository";
import { ScenarioContextAdapter } from "./infrastructure/ScenarioContextAdapter";

const labelTaskRepo = new DrizzleLabelTaskRepository(db);
const labelRepo = new DrizzleLabelRepository(db);
const rubricReader = new ScenarioContextAdapter();
const candidateReader = new CandidateContextAdapter();

export const manageLabelTasks = new ManageLabelTasks(
	labelTaskRepo,
	labelRepo,
	rubricReader,
	candidateReader,
);

export const manageLabels = new ManageLabels(labelRepo, labelTaskRepo);
