-- Create the users table to store core user information linked to Clerk
CREATE TABLE IF NOT EXISTS "users" (
    "user_id" TEXT PRIMARY KEY NOT NULL, -- Matches Clerk User ID (sub)
    "email" TEXT NOT NULL UNIQUE,       -- User's primary email from Clerk
    "full_name" TEXT,                   -- User's full name (optional, from Clerk first/last name)
    "avatar_url" TEXT,                  -- URL for user's avatar from Clerk (optional)
    "metadata" JSONB,                   -- For storing additional Clerk metadata if needed (optional)
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add comments to clarify column purposes
COMMENT ON COLUMN "users"."user_id" IS 'Primary key, matches the Clerk User ID (sub claim). Links users table to Clerk.';
COMMENT ON COLUMN "users"."email" IS 'User''s primary email address from Clerk. Should be unique.';
COMMENT ON COLUMN "users"."full_name" IS 'User''s full name, derived from Clerk''s first_name and last_name.';
COMMENT ON COLUMN "users"."avatar_url" IS 'URL of the user''s profile image from Clerk.';
COMMENT ON COLUMN "users"."metadata" IS 'Optional JSONB field to store public or private metadata from Clerk.';
COMMENT ON COLUMN "users"."created_at" IS 'Timestamp when the user record was first created in our database.';
COMMENT ON COLUMN "users"."updated_at" IS 'Timestamp when the user record was last updated.';

-- Create an index on the email column for faster lookups
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users"("email");

-- Create an index on user_id (although it's PK, explicit index can sometimes help)
CREATE INDEX IF NOT EXISTS "idx_users_user_id" ON "users"("user_id");

-- Enable Row Level Security (RLS) on the users table
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- Grant all permissions to the service_role (used by backend/webhooks)
CREATE POLICY "Allow service_role all access"
    ON "users"
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to view their own user record
CREATE POLICY "Allow users to view their own record"
    ON "users"
    FOR SELECT
    TO authenticated
    USING ((select auth.jwt()->>'sub') = "user_id");

-- Allow authenticated users to update their own user record (e.g., name, avatar)
CREATE POLICY "Allow users to update their own record"
    ON "users"
    FOR UPDATE
    TO authenticated
    USING ((select auth.jwt()->>'sub') = "user_id")
    WITH CHECK ((select auth.jwt()->>'sub') = "user_id");

-- Create the trigger for the users table to update the updated_at timestamp
CREATE TRIGGER "update_users_updated_at"
BEFORE UPDATE ON "users"
FOR EACH ROW
EXECUTE FUNCTION "public"."update_updated_at"();

-- Grant necessary permissions to roles
GRANT SELECT, INSERT, UPDATE, DELETE ON "users" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "users" TO service_role; 