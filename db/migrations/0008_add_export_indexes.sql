-- Add Export Functionality Indexes
-- Optimizes queries for export operations, batch management, and document retrieval

-- =====================================
-- DOCUMENTS TABLE INDEXES
-- =====================================

-- User-specific document queries (most common pattern: document listing)
CREATE INDEX IF NOT EXISTS "idx_documents_user_id_created_at" ON "documents" ("user_id", "created_at" DESC);

-- Status filtering with user context (dashboard filtering)
CREATE INDEX IF NOT EXISTS "idx_documents_user_id_status" ON "documents" ("user_id", "status");

-- Batch-related document queries (batch detail pages)
CREATE INDEX IF NOT EXISTS "idx_documents_batch_id_status" ON "documents" ("batch_id", "status") WHERE "batch_id" IS NOT NULL;

-- Search functionality - filename searches
CREATE INDEX IF NOT EXISTS "idx_documents_user_id_filename" ON "documents" ("user_id", "original_filename");

-- Date range filtering for analytics and metrics
CREATE INDEX IF NOT EXISTS "idx_documents_created_at_status" ON "documents" ("created_at", "status");

-- MIME type filtering for export optimization
CREATE INDEX IF NOT EXISTS "idx_documents_user_id_mime_type" ON "documents" ("user_id", "mime_type");

-- File size analytics and storage management
CREATE INDEX IF NOT EXISTS "idx_documents_user_id_file_size" ON "documents" ("user_id", "file_size");

-- =====================================
-- EXTRACTION BATCHES TABLE INDEXES
-- =====================================

-- User batch listing (primary dashboard query)
CREATE INDEX IF NOT EXISTS "idx_extraction_batches_user_id_created_at" ON "extraction_batches" ("user_id", "created_at" DESC);

-- Status filtering for batch management
CREATE INDEX IF NOT EXISTS "idx_extraction_batches_user_id_status" ON "extraction_batches" ("user_id", "status");

-- Background processing queries (cron job optimization)
CREATE INDEX IF NOT EXISTS "idx_extraction_batches_status_updated_at" ON "extraction_batches" ("status", "updated_at");

-- Batch analytics - processing time calculations
CREATE INDEX IF NOT EXISTS "idx_extraction_batches_created_at_completed_at" ON "extraction_batches" ("created_at", "completed_at") WHERE "completed_at" IS NOT NULL;

-- Prompt strategy analytics
CREATE INDEX IF NOT EXISTS "idx_extraction_batches_user_id_prompt_strategy" ON "extraction_batches" ("user_id", "prompt_strategy");

-- =====================================
-- EXTRACTED DATA TABLE INDEXES
-- =====================================

-- Document-specific data retrieval (document review pages)
CREATE INDEX IF NOT EXISTS "idx_extracted_data_document_id" ON "extracted_data" ("document_id");

-- User data export queries
CREATE INDEX IF NOT EXISTS "idx_extracted_data_user_id_created_at" ON "extracted_data" ("user_id", "created_at" DESC);

-- Job-specific lookups for processing tracking
CREATE INDEX IF NOT EXISTS "idx_extracted_data_extraction_job_id" ON "extracted_data" ("extraction_job_id");

-- Note: extracted_data doesn't have direct batch_id, use joins through extraction_jobs

-- =====================================
-- EXTRACTION JOBS TABLE INDEXES
-- =====================================

-- User job tracking and monitoring
CREATE INDEX IF NOT EXISTS "idx_extraction_jobs_user_id_status" ON "extraction_jobs" ("user_id", "status");

-- Document processing lookups
CREATE INDEX IF NOT EXISTS "idx_extraction_jobs_document_id_status" ON "extraction_jobs" ("document_id", "status");

-- Batch processing queries for background jobs
CREATE INDEX IF NOT EXISTS "idx_extraction_jobs_batch_id_status" ON "extraction_jobs" ("batch_id", "status") WHERE "batch_id" IS NOT NULL;

-- Analytics queries for metrics dashboard
CREATE INDEX IF NOT EXISTS "idx_extraction_jobs_user_id_created_at" ON "extraction_jobs" ("user_id", "created_at", "status");

-- Error tracking and debugging
CREATE INDEX IF NOT EXISTS "idx_extraction_jobs_status_updated_at" ON "extraction_jobs" ("status", "updated_at") WHERE "status" = 'failed';

-- =====================================
-- EXPORTS TABLE INDEXES
-- =====================================

-- User export history (export management page)
CREATE INDEX IF NOT EXISTS "idx_exports_user_id_created_at" ON "exports" ("user_id", "created_at" DESC);

-- Export status tracking for UI updates
CREATE INDEX IF NOT EXISTS "idx_exports_user_id_status" ON "exports" ("user_id", "status");

-- Background export processing optimization
CREATE INDEX IF NOT EXISTS "idx_exports_status_created_at" ON "exports" ("status", "created_at");

-- Export format analytics
CREATE INDEX IF NOT EXISTS "idx_exports_user_id_file_format" ON "exports" ("user_id", "file_format");

-- Cleanup queries for expired exports
CREATE INDEX IF NOT EXISTS "idx_exports_created_at_status" ON "exports" ("created_at", "status") WHERE "status" = 'completed';

-- =====================================
-- CROSS-TABLE OPTIMIZATION INDEXES
-- =====================================

-- Document + Extraction Jobs join optimization (most common join pattern)
CREATE INDEX IF NOT EXISTS "idx_documents_id_user_id" ON "documents" ("id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_extraction_jobs_document_id_user_id" ON "extraction_jobs" ("document_id", "user_id");

-- Batch + Documents join optimization
CREATE INDEX IF NOT EXISTS "idx_extraction_batches_id_user_id" ON "extraction_batches" ("id", "user_id");

-- =====================================
-- PARTIAL INDEXES FOR SPECIFIC USE CASES
-- =====================================

-- Failed documents that need retry (batch processing)
CREATE INDEX IF NOT EXISTS "idx_documents_failed_retry" ON "documents" ("batch_id", "updated_at") WHERE "status" = 'failed';

-- Completed extractions with data (export candidate optimization)
CREATE INDEX IF NOT EXISTS "idx_documents_completed_with_data" ON "documents" ("user_id", "created_at") WHERE "status" = 'completed';

-- Active batches being processed
CREATE INDEX IF NOT EXISTS "idx_batches_active_processing" ON "extraction_batches" ("updated_at", "id") WHERE "status" IN ('queued', 'processing');

-- Recently failed jobs for monitoring (simplified without time predicate)
CREATE INDEX IF NOT EXISTS "idx_jobs_recent_failures" ON "extraction_jobs" ("created_at", "user_id") WHERE "status" = 'failed';

-- Large batches for performance monitoring
CREATE INDEX IF NOT EXISTS "idx_batches_large_document_count" ON "extraction_batches" ("user_id", "document_count", "created_at") WHERE "document_count" > 10;

-- =====================================
-- JSONB INDEXES FOR FLEXIBLE QUERIES
-- =====================================

-- Export document IDs array queries
CREATE INDEX IF NOT EXISTS "idx_exports_document_ids_gin" ON "exports" USING GIN ("document_ids");

-- Extraction job options for configuration analytics
CREATE INDEX IF NOT EXISTS "idx_extraction_jobs_options_gin" ON "extraction_jobs" USING GIN ("extraction_options");

-- Export error details for debugging (removed - use trgm index instead)

-- =====================================
-- TEXT SEARCH INDEXES
-- =====================================

-- Filename text search optimization
CREATE INDEX IF NOT EXISTS "idx_documents_filename_trgm" ON "documents" USING GIN ("original_filename" gin_trgm_ops);

-- Batch name search
CREATE INDEX IF NOT EXISTS "idx_batches_name_trgm" ON "extraction_batches" USING GIN ("name" gin_trgm_ops) WHERE "name" IS NOT NULL;

-- Error message search for debugging
CREATE INDEX IF NOT EXISTS "idx_documents_error_trgm" ON "documents" USING GIN ("error_message" gin_trgm_ops) WHERE "error_message" IS NOT NULL;

-- =====================================
-- PERFORMANCE COMMENTS
-- =====================================

COMMENT ON INDEX "idx_documents_user_id_created_at" IS 'Optimizes user document listing with chronological sorting';
COMMENT ON INDEX "idx_documents_batch_id_status" IS 'Optimizes batch detail page document filtering';
COMMENT ON INDEX "idx_extraction_batches_user_id_created_at" IS 'Optimizes batch listing dashboard queries';
COMMENT ON INDEX "idx_extracted_data_document_id" IS 'Optimizes document review page data retrieval';
COMMENT ON INDEX "idx_exports_user_id_created_at" IS 'Optimizes export history and management pages';
COMMENT ON INDEX "idx_extraction_jobs_user_id_status" IS 'Optimizes job monitoring and analytics queries';
COMMENT ON INDEX "idx_exports_document_ids_gin" IS 'Enables efficient document ID array searches in exports';
COMMENT ON INDEX "idx_documents_filename_trgm" IS 'Enables fuzzy filename search functionality';