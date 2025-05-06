ALTER TABLE "user_usage" DROP CONSTRAINT "user_usage_user_id_billing_period_start_unique";--> statement-breakpoint
ALTER TABLE "user_usage" ALTER COLUMN "billing_period_start" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_usage" ALTER COLUMN "billing_period_end" SET DATA TYPE timestamp with time zone;