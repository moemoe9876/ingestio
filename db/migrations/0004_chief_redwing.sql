-- Add extraction_prompt column to documents
ALTER TABLE "documents" ADD COLUMN "extraction_prompt" text;--> statement-breakpoint
-- Add prompt_strategy column to extraction_batches
ALTER TABLE "extraction_batches" ADD COLUMN "prompt_strategy" "prompt_strategy_enum" DEFAULT 'global' NOT NULL;--> statement-breakpoint
-- Make extraction_prompt nullable in extraction_batches
ALTER TABLE "extraction_batches" ALTER COLUMN "extraction_prompt" DROP NOT NULL;
