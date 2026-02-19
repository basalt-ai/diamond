import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ── LabelTask (Aggregate Root) ─────────────────────────────────────

export const lbLabelTasks = pgTable(
  "lb_label_tasks",
  {
    id: uuid().primaryKey(),
    candidateId: uuid("candidate_id").notNull().unique(),
    rubricId: uuid("rubric_id").notNull(),
    rubricVersion: integer("rubric_version").notNull(),
    scenarioTypeId: uuid("scenario_type_id").notNull(),
    assignedTo: uuid("assigned_to"),
    state: varchar({ length: 20 }).notNull().default("pending"),
    preLabel: jsonb("pre_label"),
    adjudicationRecord: jsonb("adjudication_record"),
    finalLabelId: uuid("final_label_id"),
    labelsRequired: integer("labels_required").notNull().default(2),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("lb_label_tasks_state_idx").on(t.state),
    index("lb_label_tasks_candidate_id_idx").on(t.candidateId),
    index("lb_label_tasks_assigned_to_idx").on(t.assignedTo),
    index("lb_label_tasks_scenario_type_id_idx").on(t.scenarioTypeId),
  ]
);

// ── Label (Append-Only Entity) ─────────────────────────────────────

export const lbLabels = pgTable(
  "lb_labels",
  {
    id: uuid().primaryKey(),
    labelTaskId: uuid("label_task_id").notNull(),
    annotatorId: uuid("annotator_id").notNull(),
    labelType: varchar("label_type", { length: 30 }).notNull(),
    value: jsonb().notNull(),
    confidence: real().notNull(),
    rationale: text(),
    version: integer().notNull().default(1),
    isCurrent: boolean("is_current").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("lb_labels_label_task_id_idx").on(t.labelTaskId),
    index("lb_labels_annotator_id_idx").on(t.annotatorId),
  ]
);

// ── Relations ───────────────────────────────────────────────────────

export const lbLabelTasksRelations = relations(lbLabelTasks, ({ many }) => ({
  labels: many(lbLabels),
}));

export const lbLabelsRelations = relations(lbLabels, ({ one }) => ({
  labelTask: one(lbLabelTasks, {
    fields: [lbLabels.labelTaskId],
    references: [lbLabelTasks.id],
  }),
}));
