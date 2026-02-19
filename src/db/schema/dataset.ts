import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ── DatasetSuite ────────────────────────────────────────────────────

export const dsDatasetSuites = pgTable("ds_dataset_suites", {
  id: uuid().primaryKey(),
  name: varchar({ length: 255 }).notNull().unique(),
  description: text().notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── DatasetVersion (Aggregate Root) ─────────────────────────────────

export const dsDatasetVersions = pgTable(
  "ds_dataset_versions",
  {
    id: uuid().primaryKey(),
    suiteId: uuid("suite_id").notNull(),
    version: varchar({ length: 50 }).notNull(),
    state: varchar({ length: 20 }).notNull().default("draft"),
    scenarioGraphVersion: varchar("scenario_graph_version", {
      length: 50,
    }).notNull(),
    selectionPolicy: jsonb("selection_policy").notNull().default({}),
    candidateIds: jsonb("candidate_ids").notNull().default([]),
    lineage: jsonb(),
    gateResults: jsonb("gate_results"),
    diagnosticsId: uuid("diagnostics_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    releasedAt: timestamp("released_at", { withTimezone: true }),
  },
  (t) => [
    unique("ds_dataset_versions_suite_version_uniq").on(t.suiteId, t.version),
    index("ds_dataset_versions_suite_id_idx").on(t.suiteId),
    index("ds_dataset_versions_state_idx").on(t.state),
  ]
);

// ── Slice ───────────────────────────────────────────────────────────

export const dsSlices = pgTable(
  "ds_slices",
  {
    id: uuid().primaryKey(),
    datasetVersionId: uuid("dataset_version_id").notNull(),
    name: varchar({ length: 255 }).notNull(),
    filter: jsonb().notNull().default({}),
    candidateIds: jsonb("candidate_ids").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("ds_slices_dataset_version_id_idx").on(t.datasetVersionId)]
);

// ── DiagnosticsReport ───────────────────────────────────────────────

export const dsDiagnosticsReports = pgTable("ds_diagnostics_reports", {
  id: uuid().primaryKey(),
  datasetVersionId: uuid("dataset_version_id").notNull(),
  redundancyReport: jsonb("redundancy_report").notNull().default({}),
  agreementReport: jsonb("agreement_report").notNull().default({}),
  summary: jsonb().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Relations ───────────────────────────────────────────────────────

export const dsDatasetSuitesRelations = relations(
  dsDatasetSuites,
  ({ many }) => ({
    versions: many(dsDatasetVersions),
  })
);

export const dsDatasetVersionsRelations = relations(
  dsDatasetVersions,
  ({ one, many }) => ({
    suite: one(dsDatasetSuites, {
      fields: [dsDatasetVersions.suiteId],
      references: [dsDatasetSuites.id],
    }),
    slices: many(dsSlices),
  })
);

export const dsSlicesRelations = relations(dsSlices, ({ one }) => ({
  datasetVersion: one(dsDatasetVersions, {
    fields: [dsSlices.datasetVersionId],
    references: [dsDatasetVersions.id],
  }),
}));
