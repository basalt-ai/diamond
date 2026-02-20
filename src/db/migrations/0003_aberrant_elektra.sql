ALTER TABLE "in_clusters" ADD COLUMN "candidate_ids" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "in_clusters" ADD COLUMN "suggested_risk_category" varchar(20);--> statement-breakpoint
ALTER TABLE "in_clusters" ADD COLUMN "suggested_failure_modes" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "in_clusters" ADD COLUMN "suggested_context_profile" jsonb;--> statement-breakpoint
ALTER TABLE "sc_scenario_types" ADD COLUMN "needs_review" boolean DEFAULT false NOT NULL;