CREATE TABLE "generated_resumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"persona_id" uuid NOT NULL,
	"job_id" uuid,
	"title" varchar(200),
	"instructions" text,
	"content" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generated_resumes" ADD CONSTRAINT "generated_resumes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_resumes" ADD CONSTRAINT "generated_resumes_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_resumes" ADD CONSTRAINT "generated_resumes_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_generated_resumes_user_id" ON "generated_resumes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_generated_resumes_job_id" ON "generated_resumes" USING btree ("job_id");