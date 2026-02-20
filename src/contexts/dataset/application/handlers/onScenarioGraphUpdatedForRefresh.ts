import type { DomainEvent } from "@/lib/events/DomainEvent";

import type { GraphChange } from "../../domain/services/VersionComputer";
import { autoRefreshOrchestrator } from "../../index";

export async function onScenarioGraphUpdatedForRefresh(
  event: DomainEvent
): Promise<void> {
  const { changes } = event.payload as {
    previous_version: string;
    new_version: string;
    changes: GraphChange[];
  };

  try {
    await autoRefreshOrchestrator.checkAllSuites(changes);
  } catch (error) {
    console.error(
      "[onScenarioGraphUpdatedForRefresh] Error checking auto-refresh:",
      error
    );
  }
}
