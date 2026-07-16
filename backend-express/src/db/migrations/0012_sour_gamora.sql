CREATE TYPE "public"."contact_channel" AS ENUM('EMAIL', 'LINKEDIN', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."contact_status" AS ENUM('NO_RESPONSE', 'HEARD_BACK', 'REFERRED', 'DECLINED');--> statement-breakpoint
CREATE TABLE "job_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"contact" varchar(500) NOT NULL,
	"channel" "contact_channel",
	"status" "contact_status" DEFAULT 'NO_RESPONSE' NOT NULL,
	"reached_out_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "job_contacts" ADD CONSTRAINT "job_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_contacts" ADD CONSTRAINT "job_contacts_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_job_contacts_user_id" ON "job_contacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_job_contacts_job_id" ON "job_contacts" USING btree ("job_id");