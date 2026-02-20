import { onEpisodeIngested } from "@/contexts/candidate/application/handlers/onEpisodeIngested";
import { onLabelTaskFinalized } from "@/contexts/candidate/application/handlers/onLabelTaskFinalized";
import { onLabelTaskFinalizedForRefresh } from "@/contexts/dataset/application/handlers/onLabelTaskFinalizedForRefresh";
import { onScenarioGraphUpdatedForRefresh } from "@/contexts/dataset/application/handlers/onScenarioGraphUpdatedForRefresh";
import { onDatasetVersionReleased } from "@/contexts/export/application/handlers/onDatasetVersionReleased";
import { onCandidateCreated } from "@/contexts/intelligence/application/handlers/onCandidateCreated";
import { onClusteringRunCompleted } from "@/contexts/intelligence/application/handlers/onClusteringRunCompleted";
import { onScenarioGraphUpdated } from "@/contexts/intelligence/application/handlers/onScenarioGraphUpdated";
import { onCandidateSelected } from "@/contexts/labeling/application/handlers/onCandidateSelected";
import { onRubricVersionCreated } from "@/contexts/labeling/application/handlers/onRubricVersionCreated";

import { eventBus } from "./InProcessEventBus";

eventBus.subscribe("episode.ingested", onEpisodeIngested);
eventBus.subscribe("label_task.finalized", onLabelTaskFinalized);
eventBus.subscribe("label_task.finalized", onLabelTaskFinalizedForRefresh);
eventBus.subscribe("dataset_version.released", onDatasetVersionReleased);
eventBus.subscribe("candidate.created", onCandidateCreated);
eventBus.subscribe("scenario_graph.updated", onScenarioGraphUpdated);
eventBus.subscribe("scenario_graph.updated", onScenarioGraphUpdatedForRefresh);
eventBus.subscribe("clustering_run.completed", onClusteringRunCompleted);
eventBus.subscribe("candidate.state_changed", onCandidateSelected);
eventBus.subscribe("rubric.version_created", onRubricVersionCreated);
