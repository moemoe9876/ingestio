-- Enable Row Level Security on the profiles table
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;

-- Create policies that allow users to access only their own profiles
CREATE POLICY "Users can view their own profile"
  ON "profiles"
  FOR SELECT TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id");

CREATE POLICY "Users can update their own profile"
  ON "profiles"
  FOR UPDATE TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id")
  WITH CHECK ((select auth.jwt()->>'sub') = "user_id");

-- Service role policy for webhook operations
CREATE POLICY "Service role can perform all operations"
  ON "profiles" FOR ALL TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Grant necessary permissions
GRANT SELECT, UPDATE ON "public"."profiles" TO authenticated;
GRANT ALL ON "public"."profiles" TO service_role;

-- Create an index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS "idx_profiles_user_id" ON "profiles"("user_id");

-- Add a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION "update_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updated_at" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function whenever a profile is updated
CREATE TRIGGER "update_profiles_updated_at"
BEFORE UPDATE ON "profiles"
FOR EACH ROW
EXECUTE FUNCTION "update_updated_at"(); 