import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ── Episode (Aggregate Root) ──────────────────────────────────────

export const igEpisodes = pgTable(
  "ig_episodes",
  {
    id: uuid().primaryKey(),
    source: varchar({ length: 255 }).notNull(),
    sourceTraceId: varchar("source_trace_id", { length: 512 }).notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }),
    inputs: jsonb().notNull().default({}),
    outputs: jsonb().notNull().default({}),
    trace: jsonb().notNull().default({}),
    outcomes: jsonb().notNull().default({}),
    modelVersion: varchar("model_version", { length: 100 }),
    locale: varchar({ length: 50 }),
    planTier: varchar("plan_tier", { length: 50 }),
    device: varchar({ length: 100 }),
    scenarioTypeId: uuid("scenario_type_id"),
    hasNegativeFeedback: boolean("has_negative_feedback")
      .notNull()
      .default(false),
    artifactUri: text("artifact_uri"),
    artifactSizeBytes: integer("artifact_size_bytes"),
    metadata: jsonb().notNull().default({}),
    piiRedactionCount: integer("pii_redaction_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("ig_episodes_source_trace_uniq").on(t.source, t.sourceTraceId),
    index("ig_episodes_source_idx").on(t.source),
    index("ig_episodes_occurred_at_idx").on(t.occurredAt),
    index("ig_episodes_ingested_at_idx").on(t.ingestedAt),
    index("ig_episodes_model_version_idx").on(t.modelVersion),
    index("ig_episodes_has_negative_feedback_idx").on(t.hasNegativeFeedback),
  ]
);
