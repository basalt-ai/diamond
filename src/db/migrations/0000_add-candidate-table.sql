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
CREATE INDEX "cd_candidates_scenario_type_id_idx" ON "cd_candidates" USING btree ("scenario_type_id");