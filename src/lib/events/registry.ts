import { onEpisodeIngested } from "@/contexts/candidate/application/handlers/onEpisodeIngested";
import { onLabelTaskFinalized } from "@/contexts/candidate/application/handlers/onLabelTaskFinalized";

import { eventBus } from "./InProcessEventBus";

eventBus.subscribe("episode.ingested", onEpisodeIngested);
eventBus.subscribe("label_task.finalized", onLabelTaskFinalized);
