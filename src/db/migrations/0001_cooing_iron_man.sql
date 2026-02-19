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
CREATE INDEX "lb_label_tasks_state_idx" ON "lb_label_tasks" USING btree ("state");--> statement-breakpoint
CREATE INDEX "lb_label_tasks_candidate_id_idx" ON "lb_label_tasks" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "lb_label_tasks_assigned_to_idx" ON "lb_label_tasks" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "lb_label_tasks_scenario_type_id_idx" ON "lb_label_tasks" USING btree ("scenario_type_id");--> statement-breakpoint
CREATE INDEX "lb_labels_label_task_id_idx" ON "lb_labels" USING btree ("label_task_id");--> statement-breakpoint
CREATE INDEX "lb_labels_annotator_id_idx" ON "lb_labels" USING btree ("annotator_id");