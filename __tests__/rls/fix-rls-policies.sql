-- Clean up users policies
DROP POLICY IF EXISTS "Users can view their own user record" ON "public"."users";
DROP POLICY IF EXISTS "Users can update their own user record" ON "public"."users";
DROP POLICY IF EXISTS "Service role full access on users" ON "public"."users";
DROP POLICY IF EXISTS "Anonymous cannot access users" ON "public"."users"; -- Drop explicit deny

-- Recreate users policies (Simplified)
CREATE POLICY "Users can view their own user record"
  ON "public"."users" FOR SELECT
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id");

CREATE POLICY "Users can update their own user record"
  ON "public"."users" FOR UPDATE
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id")
  WITH CHECK ((select auth.jwt()->>'sub') = "user_id");

CREATE POLICY "Service role full access on users"
  ON "public"."users" FOR ALL
  TO service_role -- Explicitly target service_role
  USING (true) WITH CHECK (true);

-- Clean up profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can update their own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Service role full access on profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "Anonymous cannot access profiles" ON "public"."profiles"; -- Drop explicit deny

-- Recreate profiles policies (Simplified)
CREATE POLICY "Users can view their own profile"
  ON "public"."profiles" FOR SELECT
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id");

CREATE POLICY "Users can update their own profile"
  ON "public"."profiles" FOR UPDATE
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id")
  WITH CHECK ((select auth.jwt()->>'sub') = "user_id");

CREATE POLICY "Service role full access on profiles"
  ON "public"."profiles" FOR ALL
  TO service_role -- Explicitly target service_role
  USING (true) WITH CHECK (true);

-- Ensure base grants are still correct
GRANT SELECT, UPDATE ON "public"."users" TO authenticated;
GRANT ALL ON "public"."users" TO service_role;
GRANT SELECT, UPDATE ON "public"."profiles" TO authenticated;
GRANT ALL ON "public"."profiles" TO service_role; 