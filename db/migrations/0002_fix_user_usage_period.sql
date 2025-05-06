-- Change column types to timestamptz
ALTER TABLE "public"."user_usage"
  ALTER COLUMN "billing_period_start" TYPE timestamptz USING "billing_period_start"::timestamptz,
  ALTER COLUMN "billing_period_end" TYPE timestamptz USING "billing_period_end"::timestamptz;

-- Drop the old unique constraint if it exists
ALTER TABLE "public"."user_usage"
  DROP CONSTRAINT IF EXISTS "user_usage_user_id_billing_period_start_unique";

-- Optional: Add a temporary index to help with constraint creation on large tables
-- CREATE INDEX IF NOT EXISTS idx_user_usage_user_id_month_start_temp ON "public"."user_usage" (user_id, DATE_TRUNC('month', billing_period_start AT TIME ZONE 'UTC'));

-- Add the new unique constraint for user_id and the UTC month of billing_period_start
-- by creating a unique index on the expression.
-- Note: Before applying this, ensure no existing data violates this constraint.
CREATE UNIQUE INDEX "user_usage_user_id_utc_month_idx"
  ON "public"."user_usage" (user_id, DATE_TRUNC('month', billing_period_start AT TIME ZONE 'UTC'));

-- Optional: Drop the temporary index if it was created
-- DROP INDEX IF EXISTS idx_user_usage_user_id_month_start_temp;