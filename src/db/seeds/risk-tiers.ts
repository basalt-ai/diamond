import { sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import { db } from "@/db";

const DEFAULT_RISK_TIERS = [
  {
    name: "critical",
    weight: 1.0,
    category: "safety",
  },
  {
    name: "high",
    weight: 0.75,
    category: "compliance",
  },
  {
    name: "medium",
    weight: 0.5,
    category: "business",
  },
  {
    name: "low",
    weight: 0.25,
    category: "business",
  },
] as const;

export async function seedRiskTiers(): Promise<void> {
  for (const tier of DEFAULT_RISK_TIERS) {
    const id = uuidv7();
    await db.execute(sql`
      INSERT INTO sc_risk_tiers (id, name, weight, category, created_at, updated_at)
      VALUES (${id}, ${tier.name}, ${tier.weight}, ${tier.category}, NOW(), NOW())
      ON CONFLICT (name) DO NOTHING
    `);
  }

  console.log(`Seeded ${DEFAULT_RISK_TIERS.length} default risk tiers`);
}
