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
CREATE INDEX "ds_dataset_versions_suite_id_idx" ON "ds_dataset_versions" USING btree ("suite_id");--> statement-breakpoint
CREATE INDEX "ds_dataset_versions_state_idx" ON "ds_dataset_versions" USING btree ("state");--> statement-breakpoint
CREATE INDEX "ds_slices_dataset_version_id_idx" ON "ds_slices" USING btree ("dataset_version_id");--> statement-breakpoint
CREATE INDEX "ex_export_jobs_dataset_version_id_idx" ON "ex_export_jobs" USING btree ("dataset_version_id");--> statement-breakpoint
CREATE INDEX "ex_export_jobs_state_idx" ON "ex_export_jobs" USING btree ("state");--> statement-breakpoint
CREATE INDEX "ig_episodes_source_idx" ON "ig_episodes" USING btree ("source");--> statement-breakpoint
CREATE INDEX "ig_episodes_occurred_at_idx" ON "ig_episodes" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "ig_episodes_ingested_at_idx" ON "ig_episodes" USING btree ("ingested_at");--> statement-breakpoint
CREATE INDEX "ig_episodes_model_version_idx" ON "ig_episodes" USING btree ("model_version");--> statement-breakpoint
CREATE INDEX "ig_episodes_has_negative_feedback_idx" ON "ig_episodes" USING btree ("has_negative_feedback");