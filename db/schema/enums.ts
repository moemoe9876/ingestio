import { pgEnum } from "drizzle-orm/pg-core";

// New Enum for Batch Upload Prompt Strategy
export const promptStrategyEnum = pgEnum("prompt_strategy_enum", [
  "global", // Single prompt for all docs in batch
  "per_document", // Specific prompt stored for each doc
  "auto", // Auto-classify and use default prompt per doc
]);

// Existing Enum for Batch Status (Moved from extraction-batches-schema.ts)
export const batchStatusEnum = pgEnum("batch_status_enum", [
  "pending_upload", // Initial state before files fully processed by action
  "queued", // Ready for background processor
  "processing",
  "completed",
  "partially_completed",
  "failed",
]);

// Existing Enum for Document Status (Moved from documents-schema.ts)
// Note: 'queued_for_processing' is not included per plan, can be added later if needed.
export const documentStatusEnum = pgEnum("document_status", [
  "uploaded", // Default after successful upload action
  "processing",
  "completed",
  "failed",
]);

// Enum for Extraction Job Status (Likely exists elsewhere, add if needed)
// export const extractionStatusEnum = pgEnum("extraction_status", ["queued", "processing", "completed", "failed"]);

// Enum for User Membership (Likely exists elsewhere)
// export const membershipEnum = pgEnum("membership", ["starter", "plus", "growth"]);

// Enum for Export Format (Likely exists elsewhere)
// export const exportFormatEnum = pgEnum("export_format", ["json", "csv", "excel"]); 