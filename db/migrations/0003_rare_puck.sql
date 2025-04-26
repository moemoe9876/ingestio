DO $$ BEGIN
 CREATE TYPE "public"."batch_status_enum" AS ENUM('pending_upload', 'queued', 'processing', 'completed', 'partially_completed', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
 ALTER TABLE "extraction_jobs" DROP CONSTRAINT "extraction_jobs_batch_id_extraction_batches_id_fk";
 --> statement-breakpoint
 ALTER TABLE "extraction_batches" ALTER COLUMN "status" SET DATA TYPE batch_status_enum USING status::text::batch_status_enum;--> statement-breakpoint
 ALTER TABLE "extraction_batches" ALTER COLUMN "status" SET DEFAULT 'pending_upload'::batch_status_enum;--> statement-breakpoint
 ALTER TABLE "documents" ADD COLUMN "batch_id" uuid;--> statement-breakpoint
ALTER TABLE "extraction_batches" ADD COLUMN "extraction_prompt" text NOT NULL;--> statement-breakpoint
ALTER TABLE "extraction_batches" ADD COLUMN "total_pages" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "extraction_batches" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_batch_id_extraction_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."extraction_batches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extraction_jobs" ADD CONSTRAINT "extraction_jobs_batch_id_extraction_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."extraction_batches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
