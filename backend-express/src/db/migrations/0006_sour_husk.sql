CREATE TABLE "cover_letters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"persona_id" uuid,
	"title" varchar(200),
	"instructions" text,
	"body_markdown" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_cover_letters_user_id" ON "cover_letters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_cover_letters_job_id" ON "cover_letters" USING btree ("job_id");