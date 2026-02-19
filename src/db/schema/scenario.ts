import { relations } from "drizzle-orm";
import {
  boolean,
  jsonb,
  integer,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ── Reference Entities ──────────────────────────────────────────────

export const scFailureModes = pgTable("sc_failure_modes", {
  id: uuid().primaryKey(),
  name: varchar({ length: 255 }).notNull().unique(),
  description: text().notNull().default(""),
  severity: varchar({ length: 20 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const scRiskTiers = pgTable("sc_risk_tiers", {
  id: uuid().primaryKey(),
  name: varchar({ length: 255 }).notNull().unique(),
  weight: real().notNull(),
  category: varchar({ length: 20 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const scContextProfiles = pgTable("sc_context_profiles", {
  id: uuid().primaryKey(),
  name: varchar({ length: 255 }).notNull().unique(),
  attributes: jsonb().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── ScenarioType (Aggregate Root) ───────────────────────────────────

export const scScenarioTypes = pgTable(
  "sc_scenario_types",
  {
    id: uuid().primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    description: text().notNull().default(""),
    parentId: uuid("parent_id"),
    riskTierId: uuid("risk_tier_id").notNull(),
    archived: boolean().notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.parentId, t.name)]
);

// ── Join Tables ─────────────────────────────────────────────────────

export const scScenarioTypeFailureModes = pgTable(
  "sc_scenario_type_failure_modes",
  {
    scenarioTypeId: uuid("scenario_type_id").notNull(),
    failureModeId: uuid("failure_mode_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.scenarioTypeId, t.failureModeId] })]
);

export const scScenarioTypeContextProfiles = pgTable(
  "sc_scenario_type_context_profiles",
  {
    scenarioTypeId: uuid("scenario_type_id").notNull(),
    contextProfileId: uuid("context_profile_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.scenarioTypeId, t.contextProfileId] })]
);

// ── Rubric (Versioned Entity) ───────────────────────────────────────

export const scRubrics = pgTable(
  "sc_rubrics",
  {
    id: uuid().primaryKey(),
    scenarioTypeId: uuid("scenario_type_id").notNull(),
    version: integer().notNull().default(1),
    criteria: jsonb().notNull().default([]),
    examples: jsonb().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.scenarioTypeId, t.version)]
);

// ── ScenarioGraph Versions ──────────────────────────────────────────

export const scScenarioGraphVersions = pgTable("sc_scenario_graph_versions", {
  id: uuid().primaryKey(),
  version: integer().notNull().unique(),
  snapshot: jsonb().notNull(),
  changes: jsonb().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Relations ───────────────────────────────────────────────────────

export const scScenarioTypesRelations = relations(
  scScenarioTypes,
  ({ one, many }) => ({
    parent: one(scScenarioTypes, {
      fields: [scScenarioTypes.parentId],
      references: [scScenarioTypes.id],
      relationName: "parentChild",
    }),
    children: many(scScenarioTypes, { relationName: "parentChild" }),
    riskTier: one(scRiskTiers, {
      fields: [scScenarioTypes.riskTierId],
      references: [scRiskTiers.id],
    }),
    failureModeJoins: many(scScenarioTypeFailureModes),
    contextProfileJoins: many(scScenarioTypeContextProfiles),
    rubrics: many(scRubrics),
  })
);

export const scScenarioTypeFailureModesRelations = relations(
  scScenarioTypeFailureModes,
  ({ one }) => ({
    scenarioType: one(scScenarioTypes, {
      fields: [scScenarioTypeFailureModes.scenarioTypeId],
      references: [scScenarioTypes.id],
    }),
    failureMode: one(scFailureModes, {
      fields: [scScenarioTypeFailureModes.failureModeId],
      references: [scFailureModes.id],
    }),
  })
);

export const scScenarioTypeContextProfilesRelations = relations(
  scScenarioTypeContextProfiles,
  ({ one }) => ({
    scenarioType: one(scScenarioTypes, {
      fields: [scScenarioTypeContextProfiles.scenarioTypeId],
      references: [scScenarioTypes.id],
    }),
    contextProfile: one(scContextProfiles, {
      fields: [scScenarioTypeContextProfiles.contextProfileId],
      references: [scContextProfiles.id],
    }),
  })
);

export const scRubricsRelations = relations(scRubrics, ({ one }) => ({
  scenarioType: one(scScenarioTypes, {
    fields: [scRubrics.scenarioTypeId],
    references: [scScenarioTypes.id],
  }),
}));
