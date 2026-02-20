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
	"representative_candidate_ids" text[] DEFAULT '{}' NOT NULL,
	"suggested_name" varchar(255),
	"suggested_description" text,
	"induced_scenario_type_id" uuid,
	"centroid" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "in_clusters" ADD CONSTRAINT "in_clusters_clustering_run_id_in_clustering_runs_id_fk" FOREIGN KEY ("clustering_run_id") REFERENCES "public"."in_clustering_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "in_clusters" ADD CONSTRAINT "in_clusters_induced_scenario_type_id_sc_scenario_types_id_fk" FOREIGN KEY ("induced_scenario_type_id") REFERENCES "public"."sc_scenario_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "in_clusters_run_id_idx" ON "in_clusters" USING btree ("clustering_run_id");