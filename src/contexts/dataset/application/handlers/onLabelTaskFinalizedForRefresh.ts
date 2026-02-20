import type { DomainEvent } from "@/lib/events/DomainEvent";

import { autoRefreshOrchestrator } from "../../index";

export async function onLabelTaskFinalizedForRefresh(
  event: DomainEvent
): Promise<void> {
  try {
    await autoRefreshOrchestrator.checkAllSuites();
  } catch (error) {
    console.error(
      "[onLabelTaskFinalizedForRefresh] Error checking auto-refresh:",
      error
    );
  }
}
