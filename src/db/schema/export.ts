import {
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

// ── ExportJob (Aggregate Root) ─────────────────────────────────────

export const exExportJobs = pgTable(
  "ex_export_jobs",
  {
    id: uuid().primaryKey(),
    datasetVersionId: uuid("dataset_version_id").notNull(),
    format: varchar({ length: 20 }).notNull(),
    state: varchar({ length: 20 }).notNull().default("pending"),
    artifactPath: text("artifact_path"),
    artifactSizeBytes: integer("artifact_size_bytes"),
    artifactChecksum: varchar("artifact_checksum", { length: 128 }),
    rowCount: integer("row_count"),
    metadata: jsonb().notNull().default({}),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    unique("ex_export_jobs_version_format_uniq").on(
      t.datasetVersionId,
      t.format
    ),
    index("ex_export_jobs_dataset_version_id_idx").on(t.datasetVersionId),
    index("ex_export_jobs_state_idx").on(t.state),
  ]
);
