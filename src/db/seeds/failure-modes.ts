import { sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import { db } from "@/db";

const DEFAULT_FAILURE_MODES = [
  {
    name: "hallucination",
    description: "Model generates factually incorrect information",
    severity: "critical",
  },
  {
    name: "refusal_error",
    description: "Model refuses a valid request inappropriately",
    severity: "high",
  },
  {
    name: "tool_misuse",
    description: "Model calls tools incorrectly or with wrong parameters",
    severity: "high",
  },
  {
    name: "policy_violation",
    description: "Model violates safety or content policies",
    severity: "critical",
  },
  {
    name: "retrieval_miss",
    description: "Model fails to use relevant retrieved context",
    severity: "medium",
  },
  {
    name: "instruction_drift",
    description: "Model ignores or contradicts user instructions",
    severity: "medium",
  },
] as const;

export async function seedFailureModes(): Promise<void> {
  for (const fm of DEFAULT_FAILURE_MODES) {
    const id = uuidv7();
    await db.execute(sql`
      INSERT INTO sc_failure_modes (id, name, description, severity, created_at, updated_at)
      VALUES (${id}, ${fm.name}, ${fm.description}, ${fm.severity}, NOW(), NOW())
      ON CONFLICT (name) DO NOTHING
    `);
  }

  console.log(`Seeded ${DEFAULT_FAILURE_MODES.length} default failure modes`);
}
