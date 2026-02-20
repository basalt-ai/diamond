import { eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { cdCandidates } from "@/db/schema/candidate";
import type { DomainEvent } from "@/lib/events/DomainEvent";

export async function onScenarioGraphUpdated(
  event: DomainEvent
): Promise<void> {
  const affectedTypeIds = event.payload.affected_scenario_type_ids as
    | string[]
    | undefined;

  if (affectedTypeIds && affectedTypeIds.length > 0) {
    // Mark candidates mapped to affected scenario types as dirty
    await db
      .update(cdCandidates)
      .set({ scoringDirty: true, updatedAt: new Date() })
      .where(inArray(cdCandidates.scenarioTypeId, affectedTypeIds));
  } else {
    // If no specific types, mark all mapped candidates as dirty
    await db
      .update(cdCandidates)
      .set({ scoringDirty: true, updatedAt: new Date() })
      .where(sql`${cdCandidates.scenarioTypeId} IS NOT NULL`);
  }
}
