-- Create prompt_strategy_enum type if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prompt_strategy_enum') THEN
        CREATE TYPE prompt_strategy_enum AS ENUM ('global', 'per_document', 'auto');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

-- Add extraction_prompt column to documents if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'documents'
        AND column_name = 'extraction_prompt'
    ) THEN
        ALTER TABLE documents ADD COLUMN extraction_prompt text;
    END IF;
EXCEPTION
    WHEN duplicate_column THEN
        NULL;
END $$;

-- Add prompt_strategy column to extraction_batches if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'extraction_batches'
        AND column_name = 'prompt_strategy'
    ) THEN
        ALTER TABLE extraction_batches ADD COLUMN prompt_strategy prompt_strategy_enum DEFAULT 'global' NOT NULL;
    END IF;
EXCEPTION
    WHEN duplicate_column THEN
        NULL;
END $$;

-- Make extraction_prompt nullable in extraction_batches
DO $$
BEGIN
    ALTER TABLE extraction_batches ALTER COLUMN extraction_prompt DROP NOT NULL;
EXCEPTION
    WHEN others THEN
        NULL;
END $$; 