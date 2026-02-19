import {
  index,
  jsonb,
  pgTable,
  real,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ── Candidate (Aggregate Root) ────────────────────────────────────

export const cdCandidates = pgTable(
  "cd_candidates",
  {
    id: uuid().primaryKey(),
    episodeId: uuid("episode_id").notNull().unique(),
    scenarioTypeId: uuid("scenario_type_id"),
    state: varchar({ length: 20 }).notNull().default("raw"),
    mappingConfidence: real("mapping_confidence").notNull().default(0.0),
    scores: jsonb().notNull().default({}),
    features: jsonb().notNull().default({}),
    selectionRunId: uuid("selection_run_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("cd_candidates_state_idx").on(t.state),
    index("cd_candidates_scenario_type_id_idx").on(t.scenarioTypeId),
  ]
);
