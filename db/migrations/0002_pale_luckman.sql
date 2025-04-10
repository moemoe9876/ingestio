-- First transaction: Add enum values
DO $$ BEGIN
 CREATE TYPE "public"."document_status" AS ENUM('uploaded', 'processing', 'completed', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."export_format" AS ENUM('json', 'csv', 'excel');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."extraction_status" AS ENUM('queued', 'processing', 'completed', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Add enum values conditionally if they don't exist
DO $$
BEGIN
    -- Check if 'starter' value exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'starter' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'membership')) THEN
        ALTER TYPE "membership" ADD VALUE 'starter';
    END IF;
    
    -- Check if 'plus' value exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'plus' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'membership')) THEN
        ALTER TYPE "membership" ADD VALUE 'plus';
    END IF;
    
    -- Check if 'growth' value exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'growth' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'membership')) THEN
        ALTER TYPE "membership" ADD VALUE 'growth';
    END IF;
END$$;
--> statement-breakpoint

-- IMPORTANT: Commit the transaction containing the enum changes
COMMIT;
-- Start a new transaction

-- Second transaction: Use the new enum values and create tables
BEGIN;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"original_filename" text NOT NULL,
	"storage_path" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"page_count" integer NOT NULL,
	"status" "document_status" DEFAULT 'uploaded' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"format" "export_format" NOT NULL,
	"status" text NOT NULL,
	"file_path" text,
	"document_ids" uuid[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "extracted_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"extraction_job_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"data" jsonb NOT NULL,
	"document_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "extraction_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text,
	"status" text NOT NULL,
	"document_count" integer DEFAULT 0 NOT NULL,
	"completed_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "extraction_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"document_id" uuid NOT NULL,
	"batch_id" uuid,
	"status" "extraction_status" DEFAULT 'queued' NOT NULL,
	"extraction_prompt" text,
	"extraction_options" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"billing_period_start" timestamp NOT NULL,
	"billing_period_end" timestamp NOT NULL,
	"pages_processed" integer DEFAULT 0 NOT NULL,
	"pages_limit" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_usage_user_id_billing_period_start_unique" UNIQUE("user_id","billing_period_start")
);
--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "membership" SET DEFAULT 'starter';--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "exports" ADD CONSTRAINT "exports_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extracted_data" ADD CONSTRAINT "extracted_data_extraction_job_id_extraction_jobs_id_fk" FOREIGN KEY ("extraction_job_id") REFERENCES "public"."extraction_jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extracted_data" ADD CONSTRAINT "extracted_data_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extracted_data" ADD CONSTRAINT "extracted_data_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extraction_batches" ADD CONSTRAINT "extraction_batches_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extraction_jobs" ADD CONSTRAINT "extraction_jobs_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extraction_jobs" ADD CONSTRAINT "extraction_jobs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extraction_jobs" ADD CONSTRAINT "extraction_jobs_batch_id_extraction_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."extraction_batches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_usage" ADD CONSTRAINT "user_usage_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
-- Add check constraint for extraction_batches status
ALTER TABLE "extraction_batches" ADD CONSTRAINT "extraction_batches_status_check" 
CHECK (status IN ('created', 'processing', 'completed', 'failed', 'partially_completed'));
--> statement-breakpoint
-- Add check constraint for exports status
ALTER TABLE "exports" ADD CONSTRAINT "exports_status_check"
CHECK (status IN ('processing', 'completed', 'failed'));
--> statement-breakpoint
-- Add updated_at triggers for all new tables
CREATE OR REPLACE FUNCTION "public"."update_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updated_at" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "update_documents_updated_at"
BEFORE UPDATE ON "public"."documents"
FOR EACH ROW
EXECUTE FUNCTION "public"."update_updated_at"();
--> statement-breakpoint
CREATE TRIGGER "update_exports_updated_at"
BEFORE UPDATE ON "public"."exports"
FOR EACH ROW
EXECUTE FUNCTION "public"."update_updated_at"();
--> statement-breakpoint
CREATE TRIGGER "update_extracted_data_updated_at"
BEFORE UPDATE ON "public"."extracted_data"
FOR EACH ROW
EXECUTE FUNCTION "public"."update_updated_at"();
--> statement-breakpoint
CREATE TRIGGER "update_extraction_batches_updated_at"
BEFORE UPDATE ON "public"."extraction_batches"
FOR EACH ROW
EXECUTE FUNCTION "public"."update_updated_at"();
--> statement-breakpoint
CREATE TRIGGER "update_extraction_jobs_updated_at"
BEFORE UPDATE ON "public"."extraction_jobs"
FOR EACH ROW
EXECUTE FUNCTION "public"."update_updated_at"();
--> statement-breakpoint
CREATE TRIGGER "update_user_usage_updated_at"
BEFORE UPDATE ON "public"."user_usage"
FOR EACH ROW
EXECUTE FUNCTION "public"."update_updated_at"();
