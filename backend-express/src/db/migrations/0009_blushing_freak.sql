ALTER TABLE "cover_letters" ALTER COLUMN "job_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cover_letters" ADD COLUMN "adhoc_job" jsonb;--> statement-breakpoint
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_job_xor" CHECK ((job_id IS NULL) <> (adhoc_job IS NULL));