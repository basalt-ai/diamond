CREATE TABLE "cd_candidates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"episode_id" uuid NOT NULL,
	"scenario_type_id" uuid,
	"state" varchar(20) DEFAULT 'raw' NOT NULL,
	"mapping_confidence" real DEFAULT 0 NOT NULL,
	"scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"selection_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cd_candidates_episode_id_unique" UNIQUE("episode_id")
);
--> statement-breakpoint
CREATE TABLE "ds_dataset_suites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ds_dataset_suites_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ds_dataset_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"suite_id" uuid NOT NULL,
	"version" varchar(50) NOT NULL,
	"state" varchar(20) DEFAULT 'draft' NOT NULL,
	"scenario_graph_version" varchar(50) NOT NULL,
	"selection_policy" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"candidate_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lineage" jsonb,
	"gate_results" jsonb,
	"diagnostics_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone,
	CONSTRAINT "ds_dataset_versions_suite_version_uniq" UNIQUE("suite_id","version")
);
--> statement-breakpoint
CREATE TABLE "ds_diagnostics_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"dataset_version_id" uuid NOT NULL,
	"redundancy_report" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"agreement_report" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ds_slices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"dataset_version_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"filter" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"candidate_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ex_export_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"dataset_version_id" uuid NOT NULL,
	"format" varchar(20) NOT NULL,
	"state" varchar(20) DEFAULT 'pending' NOT NULL,
	"artifact_path" text,
	"artifact_size_bytes" integer,
	"artifact_checksum" varchar(128),
	"row_count" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "ex_export_jobs_version_format_uniq" UNIQUE("dataset_version_id","format")
);
--> statement-breakpoint
CREATE TABLE "ig_bulk_sources" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"uri" varchar(2048) NOT NULL,
	"format" varchar(50),
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"source_label" varchar(255) NOT NULL,
	"discovered_schema" jsonb,
	"field_mapping" jsonb,
	"file_checksum" varchar(128),
	"row_count" integer,
	"import_progress" jsonb,
	"error_log" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ig_episodes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source" varchar(255) NOT NULL,
	"source_trace_id" varchar(512) NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"occurred_at" timestamp with time zone,
	"inputs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"outputs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"trace" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"outcomes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"model_version" varchar(100),
	"locale" varchar(50),
	"plan_tier" varchar(50),
	"device" varchar(100),
	"scenario_type_id" uuid,
	"has_negative_feedback" boolean DEFAULT false NOT NULL,
	"artifact_uri" text,
	"artifact_size_bytes" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"pii_redaction_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ig_episodes_source_trace_uniq" UNIQUE("source","source_trace_id")
);
--> statement-breakpoint
CREATE TABLE "lb_label_tasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"candidate_id" uuid NOT NULL,
	"rubric_id" uuid NOT NULL,
	"rubric_version" integer NOT NULL,
	"scenario_type_id" uuid NOT NULL,
	"assigned_to" uuid,
	"state" varchar(20) DEFAULT 'pending' NOT NULL,
	"pre_label" jsonb,
	"adjudication_record" jsonb,
	"final_label_id" uuid,
	"labels_required" integer DEFAULT 2 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lb_label_tasks_candidate_id_unique" UNIQUE("candidate_id")
);
--> statement-breakpoint
CREATE TABLE "lb_labels" (
	"id" uuid PRIMARY KEY NOT NULL,
	"label_task_id" uuid NOT NULL,
	"annotator_id" uuid NOT NULL,
	"label_type" varchar(30) NOT NULL,
	"value" jsonb NOT NULL,
	"confidence" real NOT NULL,
	"rationale" text,
	"version" integer DEFAULT 1 NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sc_context_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sc_context_profiles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sc_failure_modes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"severity" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sc_failure_modes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sc_risk_tiers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"weight" real NOT NULL,
	"category" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sc_risk_tiers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sc_rubrics" (
	"id" uuid PRIMARY KEY NOT NULL,
	"scenario_type_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"criteria" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"examples" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sc_rubrics_scenario_type_id_version_unique" UNIQUE("scenario_type_id","version")
);
--> statement-breakpoint
CREATE TABLE "sc_scenario_graph_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"changes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sc_scenario_graph_versions_version_unique" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE "sc_scenario_type_context_profiles" (
	"scenario_type_id" uuid NOT NULL,
	"context_profile_id" uuid NOT NULL,
	CONSTRAINT "sc_scenario_type_context_profiles_scenario_type_id_context_profile_id_pk" PRIMARY KEY("scenario_type_id","context_profile_id")
);
--> statement-breakpoint
CREATE TABLE "sc_scenario_type_failure_modes" (
	"scenario_type_id" uuid NOT NULL,
	"failure_mode_id" uuid NOT NULL,
	CONSTRAINT "sc_scenario_type_failure_modes_scenario_type_id_failure_mode_id_pk" PRIMARY KEY("scenario_type_id","failure_mode_id")
);
--> statement-breakpoint
CREATE TABLE "sc_scenario_types" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"parent_id" uuid,
	"risk_tier_id" uuid NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sc_scenario_types_parent_id_name_unique" UNIQUE("parent_id","name")
);
--> statement-breakpoint
CREATE INDEX "cd_candidates_state_idx" ON "cd_candidates" USING btree ("state");--> statement-breakpoint
CREATE INDEX "cd_candidates_scenario_type_id_idx" ON "cd_candidates" USING btree ("scenario_type_id");--> statement-breakpoint
CREATE INDEX "ds_dataset_versions_suite_id_idx" ON "ds_dataset_versions" USING btree ("suite_id");--> statement-breakpoint
CREATE INDEX "ds_dataset_versions_state_idx" ON "ds_dataset_versions" USING btree ("state");--> statement-breakpoint
CREATE INDEX "ds_slices_dataset_version_id_idx" ON "ds_slices" USING btree ("dataset_version_id");--> statement-breakpoint
CREATE INDEX "ex_export_jobs_dataset_version_id_idx" ON "ex_export_jobs" USING btree ("dataset_version_id");--> statement-breakpoint
CREATE INDEX "ex_export_jobs_state_idx" ON "ex_export_jobs" USING btree ("state");--> statement-breakpoint
CREATE INDEX "ig_bulk_sources_status_idx" ON "ig_bulk_sources" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ig_bulk_sources_created_at_idx" ON "ig_bulk_sources" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ig_episodes_source_idx" ON "ig_episodes" USING btree ("source");--> statement-breakpoint
CREATE INDEX "ig_episodes_occurred_at_idx" ON "ig_episodes" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "ig_episodes_ingested_at_idx" ON "ig_episodes" USING btree ("ingested_at");--> statement-breakpoint
CREATE INDEX "ig_episodes_model_version_idx" ON "ig_episodes" USING btree ("model_version");--> statement-breakpoint
CREATE INDEX "ig_episodes_has_negative_feedback_idx" ON "ig_episodes" USING btree ("has_negative_feedback");--> statement-breakpoint
CREATE INDEX "lb_label_tasks_state_idx" ON "lb_label_tasks" USING btree ("state");--> statement-breakpoint
CREATE INDEX "lb_label_tasks_candidate_id_idx" ON "lb_label_tasks" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "lb_label_tasks_assigned_to_idx" ON "lb_label_tasks" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "lb_label_tasks_scenario_type_id_idx" ON "lb_label_tasks" USING btree ("scenario_type_id");--> statement-breakpoint
CREATE INDEX "lb_labels_label_task_id_idx" ON "lb_labels" USING btree ("label_task_id");--> statement-breakpoint
CREATE INDEX "lb_labels_annotator_id_idx" ON "lb_labels" USING btree ("annotator_id");