CREATE TYPE "public"."job_status" AS ENUM('WISHLIST', 'APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"company" varchar(255) NOT NULL,
	"location" varchar(255),
	"salary_range" varchar(255),
	"source_url" varchar(2000),
	"snapshot_markdown" text,
	"status" "job_status" DEFAULT 'WISHLIST' NOT NULL,
	"kanban_order" double precision DEFAULT 0 NOT NULL,
	"last_activity_at" timestamp with time zone,
	"ghost_days" integer DEFAULT 0 NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_jobs_user_id" ON "jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_jobs_status" ON "jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_jobs_title" ON "jobs" USING btree ("title");--> statement-breakpoint
CREATE INDEX "idx_jobs_company" ON "jobs" USING btree ("company");