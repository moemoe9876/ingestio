CREATE TYPE "public"."export_status_enum" AS ENUM ('processing', 'completed', 'failed');
CREATE TYPE "public"."export_file_format_enum" AS ENUM ('json', 'csv', 'excel');
CREATE TYPE "public"."export_type_enum" AS ENUM ('normal', 'multi_row');
ALTER TABLE "exports" ALTER COLUMN "status" SET DATA TYPE "public"."export_status_enum" USING status::text::"public"."export_status_enum";--> statement-breakpoint
ALTER TABLE "exports" ALTER COLUMN "status" SET DEFAULT 'processing';--> statement-breakpoint
ALTER TABLE "exports" ALTER COLUMN "document_ids" SET DATA TYPE jsonb USING document_ids::text::jsonb;--> statement-breakpoint
ALTER TABLE "exports" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "exports" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "exports" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "exports" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "exports" ADD COLUMN "file_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "exports" ADD COLUMN "storage_path" text NOT NULL;--> statement-breakpoint
ALTER TABLE "exports" ADD COLUMN "file_format" "export_file_format_enum" NOT NULL;--> statement-breakpoint
ALTER TABLE "exports" ADD COLUMN "export_type" "export_type_enum" NOT NULL;--> statement-breakpoint
ALTER TABLE "exports" ADD COLUMN "array_field_to_expand" text;--> statement-breakpoint
ALTER TABLE "exports" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "exports" ADD COLUMN "download_url" text;--> statement-breakpoint
ALTER TABLE "exports" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "exports" DROP COLUMN "format";--> statement-breakpoint
ALTER TABLE "exports" DROP COLUMN "file_path";