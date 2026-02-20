import { onEpisodeIngested } from "@/contexts/candidate/application/handlers/onEpisodeIngested";
import { onLabelTaskFinalized } from "@/contexts/candidate/application/handlers/onLabelTaskFinalized";
import { onDatasetVersionReleased } from "@/contexts/export/application/handlers/onDatasetVersionReleased";
import { onCandidateCreated } from "@/contexts/intelligence/application/handlers/onCandidateCreated";
import { onClusteringRunCompleted } from "@/contexts/intelligence/application/handlers/onClusteringRunCompleted";
import { onScenarioGraphUpdated } from "@/contexts/intelligence/application/handlers/onScenarioGraphUpdated";

import { eventBus } from "./InProcessEventBus";

eventBus.subscribe("episode.ingested", onEpisodeIngested);
eventBus.subscribe("label_task.finalized", onLabelTaskFinalized);
eventBus.subscribe("dataset_version.released", onDatasetVersionReleased);
eventBus.subscribe("candidate.created", onCandidateCreated);
eventBus.subscribe("scenario_graph.updated", onScenarioGraphUpdated);
eventBus.subscribe("clustering_run.completed", onClusteringRunCompleted);
