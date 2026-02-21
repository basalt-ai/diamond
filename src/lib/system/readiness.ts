import { count, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  scFailureModes,
  scRiskTiers,
  scScenarioTypes,
  systemConfig,
} from "@/db/schema";

export interface ReadinessResponse {
  ready: boolean;
  missing: string[];
  counts: {
    riskTiers: number;
    failureModes: number;
    scenarioTypes: number;
  };
}

export async function checkReadiness(): Promise<ReadinessResponse> {
  const [configRow, riskTierCount, failureModeCount, scenarioTypeCount] =
    await Promise.all([
      db
        .select({ value: systemConfig.value })
        .from(systemConfig)
        .where(eq(systemConfig.key, "setup_completed_at"))
        .then((rows) => rows[0]),
      db
        .select({ count: count() })
        .from(scRiskTiers)
        .then((rows) => rows[0]?.count ?? 0),
      db
        .select({ count: count() })
        .from(scFailureModes)
        .then((rows) => rows[0]?.count ?? 0),
      db
        .select({ count: count() })
        .from(scScenarioTypes)
        .then((rows) => rows[0]?.count ?? 0),
    ]);

  const ready = configRow !== undefined;

  const missing: string[] = [];
  if (riskTierCount === 0) missing.push("risk_tiers");
  if (failureModeCount === 0) missing.push("failure_modes");
  if (scenarioTypeCount === 0) missing.push("scenario_types");

  return {
    ready,
    missing,
    counts: {
      riskTiers: riskTierCount,
      failureModes: failureModeCount,
      scenarioTypes: scenarioTypeCount,
    },
  };
}

export async function markSetupComplete(): Promise<void> {
  await db
    .insert(systemConfig)
    .values({
      key: "setup_completed_at",
      value: { completedAt: new Date().toISOString() },
    })
    .onConflictDoUpdate({
      target: systemConfig.key,
      set: {
        value: { completedAt: new Date().toISOString() },
        updatedAt: new Date(),
      },
    });
}
