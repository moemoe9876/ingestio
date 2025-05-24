CREATE TYPE "public"."queue_item_priority_enum" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."queue_item_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed', 'retrying', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."queue_status_enum" AS ENUM('active', 'paused', 'failed', 'completed');--> statement-breakpoint
CREATE TABLE "processing_queues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "queue_status_enum" DEFAULT 'active' NOT NULL,
	"max_concurrent_jobs" integer DEFAULT 5 NOT NULL,
	"retry_limit" integer DEFAULT 3 NOT NULL,
	"processing_timeout_minutes" integer DEFAULT 30 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "queue_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"queue_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"batch_id" uuid,
	"job_type" text NOT NULL,
	"job_data" jsonb NOT NULL,
	"priority" "queue_item_priority_enum" DEFAULT 'normal' NOT NULL,
	"status" "queue_item_status_enum" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"next_retry_at" timestamp with time zone,
	"result" jsonb,
	"error_message" text,
	"error_details" jsonb,
	"worker_id" text,
	"locked_at" timestamp with time zone,
	"lock_timeout" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "queue_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"queue_id" uuid NOT NULL,
	"stats_hour" timestamp with time zone NOT NULL,
	"jobs_processed" integer DEFAULT 0 NOT NULL,
	"jobs_completed" integer DEFAULT 0 NOT NULL,
	"jobs_failed" integer DEFAULT 0 NOT NULL,
	"jobs_retried" integer DEFAULT 0 NOT NULL,
	"avg_processing_time" integer DEFAULT 0 NOT NULL,
	"max_processing_time" integer DEFAULT 0 NOT NULL,
	"min_processing_time" integer DEFAULT 0 NOT NULL,
	"backlog_size" integer DEFAULT 0 NOT NULL,
	"active_jobs" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "queue_items" ADD CONSTRAINT "queue_items_queue_id_processing_queues_id_fk" FOREIGN KEY ("queue_id") REFERENCES "public"."processing_queues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_items" ADD CONSTRAINT "queue_items_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_items" ADD CONSTRAINT "queue_items_batch_id_extraction_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."extraction_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_stats" ADD CONSTRAINT "queue_stats_queue_id_processing_queues_id_fk" FOREIGN KEY ("queue_id") REFERENCES "public"."processing_queues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Create performance indexes for queue processing
CREATE INDEX "idx_queue_items_status_priority" ON "queue_items" ("status", "priority", "scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_queue_items_queue_status" ON "queue_items" ("queue_id", "status");--> statement-breakpoint
CREATE INDEX "idx_queue_items_user_batch" ON "queue_items" ("user_id", "batch_id");--> statement-breakpoint
CREATE INDEX "idx_queue_items_job_type_status" ON "queue_items" ("job_type", "status");--> statement-breakpoint
CREATE INDEX "idx_queue_items_next_retry" ON "queue_items" ("next_retry_at") WHERE "status" = 'failed' AND "next_retry_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_queue_items_lock_timeout" ON "queue_items" ("lock_timeout") WHERE "status" = 'processing';--> statement-breakpoint
CREATE INDEX "idx_queue_items_worker_locked" ON "queue_items" ("worker_id", "locked_at") WHERE "status" = 'processing';--> statement-breakpoint

-- Create partial indexes for better performance
CREATE INDEX "idx_queue_items_pending" ON "queue_items" ("priority" DESC, "scheduled_at" ASC) WHERE "status" = 'pending';--> statement-breakpoint
CREATE INDEX "idx_queue_items_processing" ON "queue_items" ("started_at") WHERE "status" = 'processing';--> statement-breakpoint
CREATE INDEX "idx_queue_items_failed_retryable" ON "queue_items" ("next_retry_at") WHERE "status" = 'failed' AND "attempts" < "max_retries";--> statement-breakpoint

-- Create indexes for queue_stats aggregation
CREATE INDEX "idx_queue_stats_queue_hour" ON "queue_stats" ("queue_id", "stats_hour");--> statement-breakpoint
CREATE INDEX "idx_queue_stats_hour" ON "queue_stats" ("stats_hour");--> statement-breakpoint

-- Create unique constraint for stats deduplication
CREATE UNIQUE INDEX "idx_queue_stats_unique" ON "queue_stats" ("queue_id", "stats_hour");--> statement-breakpoint

-- Insert default batch processing queues
INSERT INTO "processing_queues" ("name", "description", "max_concurrent_jobs", "retry_limit", "processing_timeout_minutes")
VALUES 
  ('batch_processing', 'Main queue for batch document processing', 10, 3, 30),
  ('exports', 'Queue for document export generation', 5, 2, 15),
  ('cleanup', 'Queue for maintenance and cleanup tasks', 2, 1, 60);--> statement-breakpoint

-- Add comments for documentation
COMMENT ON TABLE "processing_queues" IS 'Manages different processing queues with their configuration';--> statement-breakpoint
COMMENT ON TABLE "queue_items" IS 'Individual job items in processing queues with retry logic';--> statement-breakpoint
COMMENT ON TABLE "queue_stats" IS 'Hourly aggregated statistics for queue monitoring and analytics';--> statement-breakpoint

COMMENT ON COLUMN "queue_items"."job_data" IS 'Flexible JSON data containing job-specific parameters';--> statement-breakpoint
COMMENT ON COLUMN "queue_items"."result" IS 'JSON result data from completed jobs';--> statement-breakpoint
COMMENT ON COLUMN "queue_items"."error_details" IS 'Structured error information for debugging';--> statement-breakpoint
COMMENT ON COLUMN "queue_items"."lock_timeout" IS 'When the current processing lock expires';--> statement-breakpoint
COMMENT ON COLUMN "queue_stats"."stats_hour" IS 'Hour timestamp for aggregated statistics';