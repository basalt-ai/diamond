CREATE EXTENSION IF NOT EXISTS vector;
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
ALTER TABLE "cd_candidates" ADD COLUMN "embedded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cd_candidates" ADD COLUMN "scoring_dirty" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "in_embeddings" ADD CONSTRAINT "in_embeddings_candidate_id_cd_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."cd_candidates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "in_embeddings_candidate_id_idx" ON "in_embeddings" USING btree ("candidate_id");--> statement-breakpoint
CREATE UNIQUE INDEX "in_embeddings_candidate_model_uniq" ON "in_embeddings" USING btree ("candidate_id","model_id");--> statement-breakpoint
CREATE INDEX "in_embeddings_hnsw_idx" ON "in_embeddings" USING hnsw ("embedding" vector_cosine_ops) WITH (m = 16, ef_construction = 128);--> statement-breakpoint
CREATE INDEX "cd_candidates_scoring_dirty_idx" ON "cd_candidates" ("id") WHERE "scoring_dirty" = true;--> statement-breakpoint
CREATE INDEX "cd_candidates_not_embedded_idx" ON "cd_candidates" ("id") WHERE "embedded_at" IS NULL;