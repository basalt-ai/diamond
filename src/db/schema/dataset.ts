import { relations } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  primaryKey,
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
    suiteId: uuid("suite_id")
      .notNull()
      .references(() => dsDatasetSuites.id, { onDelete: "restrict" }),
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

// ── DatasetVersionCandidates (Join Table) ───────────────────────────

export const dsDatasetVersionCandidates = pgTable(
  "ds_dataset_version_candidates",
  {
    datasetVersionId: uuid("dataset_version_id")
      .notNull()
      .references(() => dsDatasetVersions.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.datasetVersionId, t.candidateId] }),
    index("ds_dvc_candidate_id_idx").on(t.candidateId),
  ]
);

// ── Slice ───────────────────────────────────────────────────────────

export const dsSlices = pgTable(
  "ds_slices",
  {
    id: uuid().primaryKey(),
    datasetVersionId: uuid("dataset_version_id")
      .notNull()
      .references(() => dsDatasetVersions.id, { onDelete: "cascade" }),
    name: varchar({ length: 255 }).notNull(),
    filter: jsonb().notNull().default({}),
    candidateIds: jsonb("candidate_ids").notNull().default([]),
    isGolden: boolean("is_golden").notNull().default(false),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    staleCandidateIds: jsonb("stale_candidate_ids"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("ds_slices_dataset_version_id_idx").on(t.datasetVersionId)]
);

// ── DiagnosticsReport ───────────────────────────────────────────────

export const dsDiagnosticsReports = pgTable("ds_diagnostics_reports", {
  id: uuid().primaryKey(),
  datasetVersionId: uuid("dataset_version_id")
    .notNull()
    .references(() => dsDatasetVersions.id, { onDelete: "cascade" }),
  metrics: jsonb().notNull().default({}),
  gateResults: jsonb("gate_results"),
  summary: jsonb().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── DiagnosticsAnomalies ────────────────────────────────────────────

export const dsDiagnosticsAnomalies = pgTable(
  "ds_diagnostics_anomalies",
  {
    id: uuid().primaryKey(),
    diagnosticsReportId: uuid("diagnostics_report_id")
      .notNull()
      .references(() => dsDiagnosticsReports.id, { onDelete: "cascade" }),
    metricType: varchar("metric_type", { length: 50 }).notNull(),
    candidateId: uuid("candidate_id").notNull(),
    severity: varchar({ length: 20 }).notNull(),
    payload: jsonb().notNull().default({}),
  },
  (t) => [
    index("ds_anomalies_report_id_idx").on(t.diagnosticsReportId),
    index("ds_anomalies_metric_type_idx").on(t.metricType),
  ]
);

// ── ReleaseGatePolicy ───────────────────────────────────────────────

export const dsReleaseGatePolicies = pgTable(
  "ds_release_gate_policies",
  {
    id: uuid().primaryKey(),
    suiteId: uuid("suite_id")
      .notNull()
      .references(() => dsDatasetSuites.id, { onDelete: "restrict" }),
    gateName: varchar("gate_name", { length: 100 }).notNull(),
    metric: varchar({ length: 50 }).notNull(),
    threshold: doublePrecision().notNull(),
    comparison: varchar({ length: 10 }).notNull(),
    scope: varchar({ length: 20 }).notNull().default("overall"),
    sliceFilter: jsonb("slice_filter"),
    blocking: boolean().notNull().default(true),
    enabled: boolean().notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("ds_release_gate_policies_suite_name_uniq").on(
      t.suiteId,
      t.gateName
    ),
    index("ds_release_gate_policies_suite_enabled_idx").on(
      t.suiteId,
      t.enabled
    ),
  ]
);

// ── EvalRun ─────────────────────────────────────────────────────────

export const dsEvalRuns = pgTable(
  "ds_eval_runs",
  {
    id: uuid().primaryKey(),
    datasetVersionId: uuid("dataset_version_id")
      .notNull()
      .references(() => dsDatasetVersions.id, { onDelete: "restrict" }),
    modelName: varchar("model_name", { length: 100 }).notNull(),
    modelVersion: varchar("model_version", { length: 100 }).notNull(),
    evalRunExternalId: varchar("eval_run_external_id", { length: 200 }),
    metadata: jsonb().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ds_eval_runs_version_idx").on(t.datasetVersionId),
    unique("ds_eval_runs_extid_unique")
      .on(t.datasetVersionId, t.modelName, t.modelVersion, t.evalRunExternalId)
      .nullsNotDistinct(),
  ]
);

// ── EvalResult ──────────────────────────────────────────────────────

export const dsEvalResults = pgTable(
  "ds_eval_results",
  {
    id: uuid().primaryKey(),
    evalRunId: uuid("eval_run_id")
      .notNull()
      .references(() => dsEvalRuns.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id").notNull(),
    passed: boolean().notNull(),
    score: doublePrecision(),
    judgeOutput: jsonb("judge_output"),
    failureMode: varchar("failure_mode", { length: 100 }),
  },
  (t) => [
    index("ds_eval_results_run_idx").on(t.evalRunId),
    index("ds_eval_results_candidate_idx").on(t.candidateId),
  ]
);

// ── Relations ───────────────────────────────────────────────────────

export const dsDatasetSuitesRelations = relations(
  dsDatasetSuites,
  ({ many }) => ({
    versions: many(dsDatasetVersions),
    releaseGatePolicies: many(dsReleaseGatePolicies),
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
    versionCandidates: many(dsDatasetVersionCandidates),
    evalRuns: many(dsEvalRuns),
  })
);

export const dsDatasetVersionCandidatesRelations = relations(
  dsDatasetVersionCandidates,
  ({ one }) => ({
    datasetVersion: one(dsDatasetVersions, {
      fields: [dsDatasetVersionCandidates.datasetVersionId],
      references: [dsDatasetVersions.id],
    }),
  })
);

export const dsSlicesRelations = relations(dsSlices, ({ one }) => ({
  datasetVersion: one(dsDatasetVersions, {
    fields: [dsSlices.datasetVersionId],
    references: [dsDatasetVersions.id],
  }),
}));

export const dsDiagnosticsReportsRelations = relations(
  dsDiagnosticsReports,
  ({ one, many }) => ({
    datasetVersion: one(dsDatasetVersions, {
      fields: [dsDiagnosticsReports.datasetVersionId],
      references: [dsDatasetVersions.id],
    }),
    anomalies: many(dsDiagnosticsAnomalies),
  })
);

export const dsDiagnosticsAnomaliesRelations = relations(
  dsDiagnosticsAnomalies,
  ({ one }) => ({
    diagnosticsReport: one(dsDiagnosticsReports, {
      fields: [dsDiagnosticsAnomalies.diagnosticsReportId],
      references: [dsDiagnosticsReports.id],
    }),
  })
);

export const dsReleaseGatePoliciesRelations = relations(
  dsReleaseGatePolicies,
  ({ one }) => ({
    suite: one(dsDatasetSuites, {
      fields: [dsReleaseGatePolicies.suiteId],
      references: [dsDatasetSuites.id],
    }),
  })
);

export const dsEvalRunsRelations = relations(dsEvalRuns, ({ one, many }) => ({
  datasetVersion: one(dsDatasetVersions, {
    fields: [dsEvalRuns.datasetVersionId],
    references: [dsDatasetVersions.id],
  }),
  results: many(dsEvalResults),
}));

export const dsEvalResultsRelations = relations(dsEvalResults, ({ one }) => ({
  evalRun: one(dsEvalRuns, {
    fields: [dsEvalResults.evalRunId],
    references: [dsEvalRuns.id],
  }),
}));
