import {
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core";

import { cdCandidates } from "./candidate";
import { scScenarioTypes } from "./scenario";

// ── Embeddings ────────────────────────────────────────────────────

export const inEmbeddings = pgTable(
  "in_embeddings",
  {
    id: uuid().primaryKey(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => cdCandidates.id, { onDelete: "restrict" }),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    modelId: varchar("model_id", { length: 100 }).notNull(),
    modelVersion: varchar("model_version", { length: 50 }).notNull(),
    tokenCount: integer("token_count"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("in_embeddings_candidate_id_idx").on(t.candidateId),
    uniqueIndex("in_embeddings_candidate_model_uniq").on(
      t.candidateId,
      t.modelId
    ),
  ]
);

// ── Scenario Centroids ────────────────────────────────────────────

export const inScenarioCentroids = pgTable("in_scenario_centroids", {
  scenarioTypeId: uuid("scenario_type_id").primaryKey(),
  centroid: vector("centroid", { dimensions: 1536 }).notNull(),
  candidateCount: integer("candidate_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Scoring Runs ──────────────────────────────────────────────────

export const inScoringRuns = pgTable("in_scoring_runs", {
  id: uuid().primaryKey(),
  state: varchar({ length: 20 }).notNull().default("pending"),
  totalCandidates: integer("total_candidates").notNull().default(0),
  processedCount: integer("processed_count").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  embeddingModelId: varchar("embedding_model_id", { length: 100 }).notNull(),
  triggeredBy: varchar("triggered_by", { length: 50 }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  error: text(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Clustering Runs ──────────────────────────────────────────────

export const inClusteringRuns = pgTable("in_clustering_runs", {
  id: uuid().primaryKey(),
  state: varchar({ length: 20 }).notNull().default("pending"),
  params: jsonb().notNull().default({}),
  totalCandidates: integer("total_candidates").notNull().default(0),
  clusterCount: integer("cluster_count").notNull().default(0),
  noiseCount: integer("noise_count").notNull().default(0),
  errorMessage: text("error_message"),
  triggeredBy: varchar("triggered_by", { length: 50 }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Clusters ─────────────────────────────────────────────────────

export const inClusters = pgTable(
  "in_clusters",
  {
    id: uuid().primaryKey(),
    clusteringRunId: uuid("clustering_run_id")
      .notNull()
      .references(() => inClusteringRuns.id, { onDelete: "cascade" }),
    label: integer().notNull(),
    size: integer().notNull(),
    candidateIds: text("candidate_ids").array().notNull().default([]),
    representativeCandidateIds: text("representative_candidate_ids")
      .array()
      .notNull()
      .default([]),
    suggestedName: varchar("suggested_name", { length: 255 }),
    suggestedDescription: text("suggested_description"),
    suggestedRiskCategory: varchar("suggested_risk_category", { length: 20 }),
    suggestedFailureModes: jsonb("suggested_failure_modes")
      .notNull()
      .default([]),
    suggestedContextProfile: jsonb("suggested_context_profile"),
    inducedScenarioTypeId: uuid("induced_scenario_type_id").references(
      () => scScenarioTypes.id,
      { onDelete: "set null" }
    ),
    centroid: vector("centroid", { dimensions: 1536 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("in_clusters_run_id_idx").on(t.clusteringRunId)]
);

// ── Selection Runs ────────────────────────────────────────────────

export const inSelectionRuns = pgTable("in_selection_runs", {
  id: uuid().primaryKey(),
  state: varchar({ length: 20 }).notNull().default("pending"),
  constraints: jsonb().notNull(),
  selectedCount: integer("selected_count").notNull().default(0),
  totalPoolSize: integer("total_pool_size").notNull().default(0),
  coverageImprovement: real("coverage_improvement"),
  triggeredBy: varchar("triggered_by", { length: 50 }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  error: text(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
