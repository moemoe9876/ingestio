-- Enable Row Level Security on the users table
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- Create policies that allow users to access only their own user record
CREATE POLICY "Users can view their own user record" 
  ON "users" 
  FOR SELECT 
  USING ((select auth.jwt()->>'sub') = "user_id");

CREATE POLICY "Users can update their own user record" 
  ON "users" 
  FOR UPDATE 
  USING ((select auth.jwt()->>'sub') = "user_id")
  WITH CHECK ((select auth.jwt()->>'sub') = "user_id");

-- Service role policy for webhook operations
CREATE POLICY "Service role can perform all operations on users" 
  ON "users" 
  FOR ALL
  USING (TRUE)
  WITH CHECK (TRUE);

-- Create an index for faster lookups by email
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users"("email");

-- Create the trigger to update the updated_at timestamp
CREATE TRIGGER "update_users_updated_at"
BEFORE UPDATE ON "users"
FOR EACH ROW
EXECUTE FUNCTION "public"."update_updated_at"(); 