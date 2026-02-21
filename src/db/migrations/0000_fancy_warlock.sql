CREATE TABLE "cd_candidates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"episode_id" uuid NOT NULL,
	"scenario_type_id" uuid,
	"state" varchar(20) DEFAULT 'raw' NOT NULL,
	"mapping_confidence" real DEFAULT 0 NOT NULL,
	"scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"selection_run_id" uuid,
	"embedded_at" timestamp with time zone,
	"scoring_dirty" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cd_candidates_episode_id_unique" UNIQUE("episode_id")
);
--> statement-breakpoint
CREATE TABLE "ds_dataset_suites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"scenario_type_id" uuid NOT NULL,
	"refresh_policy" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ds_dataset_suites_name_unique" UNIQUE("name"),
	CONSTRAINT "ds_dataset_suites_scenario_type_id_uniq" UNIQUE("scenario_type_id")
);
--> statement-breakpoint
CREATE TABLE "ds_dataset_version_candidates" (
	"dataset_version_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	CONSTRAINT "ds_dataset_version_candidates_dataset_version_id_candidate_id_pk" PRIMARY KEY("dataset_version_id","candidate_id")
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
CREATE TABLE "ds_diagnostics_anomalies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"diagnostics_report_id" uuid NOT NULL,
	"metric_type" varchar(50) NOT NULL,
	"candidate_id" uuid NOT NULL,
	"severity" varchar(20) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ds_diagnostics_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"dataset_version_id" uuid NOT NULL,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"gate_results" jsonb,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ds_eval_results" (
	"id" uuid PRIMARY KEY NOT NULL,
	"eval_run_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"passed" boolean NOT NULL,
	"score" double precision,
	"judge_output" jsonb,
	"failure_mode" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "ds_eval_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"dataset_version_id" uuid NOT NULL,
	"model_name" varchar(100) NOT NULL,
	"model_version" varchar(100) NOT NULL,
	"eval_run_external_id" varchar(200),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ds_eval_runs_extid_unique" UNIQUE NULLS NOT DISTINCT("dataset_version_id","model_name","model_version","eval_run_external_id")
);
--> statement-breakpoint
CREATE TABLE "ds_refresh_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"suite_id" uuid NOT NULL,
	"triggered_by" varchar(50) NOT NULL,
	"trigger_event_id" varchar(100) NOT NULL,
	"status" varchar(30) DEFAULT 'pending_scenarios' NOT NULL,
	"scenario_changes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"candidate_count" double precision DEFAULT 0 NOT NULL,
	"dataset_version_id" uuid,
	"failure_reason" varchar(100),
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ds_release_gate_policies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"suite_id" uuid NOT NULL,
	"gate_name" varchar(100) NOT NULL,
	"metric" varchar(50) NOT NULL,
	"threshold" double precision NOT NULL,
	"comparison" varchar(10) NOT NULL,
	"scope" varchar(20) DEFAULT 'overall' NOT NULL,
	"slice_filter" jsonb,
	"blocking" boolean DEFAULT true NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ds_release_gate_policies_suite_name_uniq" UNIQUE("suite_id","gate_name")
);
--> statement-breakpoint
CREATE TABLE "ds_slices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"dataset_version_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"filter" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"candidate_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_golden" boolean DEFAULT false NOT NULL,
	"locked_at" timestamp with time zone,
	"stale_candidate_ids" jsonb,
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
CREATE TABLE "in_clustering_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"state" varchar(20) DEFAULT 'pending' NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"total_candidates" integer DEFAULT 0 NOT NULL,
	"cluster_count" integer DEFAULT 0 NOT NULL,
	"noise_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"triggered_by" varchar(50),
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "in_clusters" (
	"id" uuid PRIMARY KEY NOT NULL,
	"clustering_run_id" uuid NOT NULL,
	"label" integer NOT NULL,
	"size" integer NOT NULL,
	"candidate_ids" text[] DEFAULT '{}' NOT NULL,
	"representative_candidate_ids" text[] DEFAULT '{}' NOT NULL,
	"suggested_name" varchar(255),
	"suggested_description" text,
	"suggested_risk_category" varchar(20),
	"suggested_failure_modes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"suggested_context_profile" jsonb,
	"induced_scenario_type_id" uuid,
	"centroid" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "in_embeddings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"candidate_id" uuid NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"model_id" varchar(100) NOT NULL,
	"model_version" varchar(50) NOT NULL,
	"token_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "in_scenario_centroids" (
	"scenario_type_id" uuid PRIMARY KEY NOT NULL,
	"centroid" vector(1536) NOT NULL,
	"candidate_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "in_scoring_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"state" varchar(20) DEFAULT 'pending' NOT NULL,
	"total_candidates" integer DEFAULT 0 NOT NULL,
	"processed_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"embedding_model_id" varchar(100) NOT NULL,
	"triggered_by" varchar(50),
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "in_selection_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"state" varchar(20) DEFAULT 'pending' NOT NULL,
	"constraints" jsonb NOT NULL,
	"selected_count" integer DEFAULT 0 NOT NULL,
	"total_pool_size" integer DEFAULT 0 NOT NULL,
	"coverage_improvement" real,
	"triggered_by" varchar(50),
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"needs_review" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sc_scenario_types_parent_id_name_unique" UNIQUE("parent_id","name")
);
--> statement-breakpoint
CREATE TABLE "system_config" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ds_dataset_suites" ADD CONSTRAINT "ds_dataset_suites_scenario_type_id_sc_scenario_types_id_fk" FOREIGN KEY ("scenario_type_id") REFERENCES "public"."sc_scenario_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ds_dataset_version_candidates" ADD CONSTRAINT "ds_dataset_version_candidates_dataset_version_id_ds_dataset_versions_id_fk" FOREIGN KEY ("dataset_version_id") REFERENCES "public"."ds_dataset_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ds_dataset_versions" ADD CONSTRAINT "ds_dataset_versions_suite_id_ds_dataset_suites_id_fk" FOREIGN KEY ("suite_id") REFERENCES "public"."ds_dataset_suites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ds_diagnostics_anomalies" ADD CONSTRAINT "ds_diagnostics_anomalies_diagnostics_report_id_ds_diagnostics_reports_id_fk" FOREIGN KEY ("diagnostics_report_id") REFERENCES "public"."ds_diagnostics_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ds_diagnostics_reports" ADD CONSTRAINT "ds_diagnostics_reports_dataset_version_id_ds_dataset_versions_id_fk" FOREIGN KEY ("dataset_version_id") REFERENCES "public"."ds_dataset_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ds_eval_results" ADD CONSTRAINT "ds_eval_results_eval_run_id_ds_eval_runs_id_fk" FOREIGN KEY ("eval_run_id") REFERENCES "public"."ds_eval_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ds_eval_runs" ADD CONSTRAINT "ds_eval_runs_dataset_version_id_ds_dataset_versions_id_fk" FOREIGN KEY ("dataset_version_id") REFERENCES "public"."ds_dataset_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ds_refresh_runs" ADD CONSTRAINT "ds_refresh_runs_suite_id_ds_dataset_suites_id_fk" FOREIGN KEY ("suite_id") REFERENCES "public"."ds_dataset_suites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ds_refresh_runs" ADD CONSTRAINT "ds_refresh_runs_dataset_version_id_ds_dataset_versions_id_fk" FOREIGN KEY ("dataset_version_id") REFERENCES "public"."ds_dataset_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ds_release_gate_policies" ADD CONSTRAINT "ds_release_gate_policies_suite_id_ds_dataset_suites_id_fk" FOREIGN KEY ("suite_id") REFERENCES "public"."ds_dataset_suites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ds_slices" ADD CONSTRAINT "ds_slices_dataset_version_id_ds_dataset_versions_id_fk" FOREIGN KEY ("dataset_version_id") REFERENCES "public"."ds_dataset_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "in_clusters" ADD CONSTRAINT "in_clusters_clustering_run_id_in_clustering_runs_id_fk" FOREIGN KEY ("clustering_run_id") REFERENCES "public"."in_clustering_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "in_clusters" ADD CONSTRAINT "in_clusters_induced_scenario_type_id_sc_scenario_types_id_fk" FOREIGN KEY ("induced_scenario_type_id") REFERENCES "public"."sc_scenario_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "in_embeddings" ADD CONSTRAINT "in_embeddings_candidate_id_cd_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."cd_candidates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cd_candidates_state_idx" ON "cd_candidates" USING btree ("state");--> statement-breakpoint
CREATE INDEX "cd_candidates_scenario_type_id_idx" ON "cd_candidates" USING btree ("scenario_type_id");--> statement-breakpoint
CREATE INDEX "ds_dvc_candidate_id_idx" ON "ds_dataset_version_candidates" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "ds_dataset_versions_suite_id_idx" ON "ds_dataset_versions" USING btree ("suite_id");--> statement-breakpoint
CREATE INDEX "ds_dataset_versions_state_idx" ON "ds_dataset_versions" USING btree ("state");--> statement-breakpoint
CREATE INDEX "ds_anomalies_report_id_idx" ON "ds_diagnostics_anomalies" USING btree ("diagnostics_report_id");--> statement-breakpoint
CREATE INDEX "ds_anomalies_metric_type_idx" ON "ds_diagnostics_anomalies" USING btree ("metric_type");--> statement-breakpoint
CREATE INDEX "ds_eval_results_run_idx" ON "ds_eval_results" USING btree ("eval_run_id");--> statement-breakpoint
CREATE INDEX "ds_eval_results_candidate_idx" ON "ds_eval_results" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "ds_eval_runs_version_idx" ON "ds_eval_runs" USING btree ("dataset_version_id");--> statement-breakpoint
CREATE INDEX "ds_refresh_runs_suite_id_idx" ON "ds_refresh_runs" USING btree ("suite_id");--> statement-breakpoint
CREATE INDEX "ds_refresh_runs_status_idx" ON "ds_refresh_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ds_release_gate_policies_suite_enabled_idx" ON "ds_release_gate_policies" USING btree ("suite_id","enabled");--> statement-breakpoint
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
CREATE INDEX "lb_labels_annotator_id_idx" ON "lb_labels" USING btree ("annotator_id");--> statement-breakpoint
CREATE INDEX "in_clusters_run_id_idx" ON "in_clusters" USING btree ("clustering_run_id");--> statement-breakpoint
CREATE INDEX "in_embeddings_candidate_id_idx" ON "in_embeddings" USING btree ("candidate_id");--> statement-breakpoint
CREATE UNIQUE INDEX "in_embeddings_candidate_model_uniq" ON "in_embeddings" USING btree ("candidate_id","model_id");