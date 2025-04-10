-- Apply Corrected RLS Policies for MVP Tables

-- Ensure RLS is enabled on all relevant tables first
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_usage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."extraction_batches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."extraction_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."extracted_data" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."exports" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (using IF EXISTS for safety)

-- ========== users ==========
DROP POLICY IF EXISTS "Users can view their own user record" ON "public"."users";
DROP POLICY IF EXISTS "Users can update their own user record" ON "public"."users";
DROP POLICY IF EXISTS "Service role full access on users" ON "public"."users";
DROP POLICY IF EXISTS "Anonymous cannot access users" ON "public"."users";

-- ========== profiles ==========
DROP POLICY IF EXISTS "Users can view their own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can update their own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Service role full access on profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "Anonymous cannot access profiles" ON "public"."profiles";

-- ========== user_usage ==========
DROP POLICY IF EXISTS "Users can view their own usage" ON "public"."user_usage";
DROP POLICY IF EXISTS "Service role full access on user_usage" ON "public"."user_usage";

-- ========== documents ==========
DROP POLICY IF EXISTS "Users can view their own documents" ON "public"."documents";
DROP POLICY IF EXISTS "Users can insert their own documents" ON "public"."documents";
DROP POLICY IF EXISTS "Users can update their own documents" ON "public"."documents";
DROP POLICY IF EXISTS "Users can delete their own documents" ON "public"."documents";
DROP POLICY IF EXISTS "Service role full access on documents" ON "public"."documents";

-- ========== extraction_batches ==========
DROP POLICY IF EXISTS "Users can view their own batches" ON "public"."extraction_batches";
DROP POLICY IF EXISTS "Users can insert their own batches" ON "public"."extraction_batches";
DROP POLICY IF EXISTS "Users can update their own batches" ON "public"."extraction_batches";
DROP POLICY IF EXISTS "Users can delete their own batches" ON "public"."extraction_batches";
DROP POLICY IF EXISTS "Service role full access on extraction_batches" ON "public"."extraction_batches";

-- ========== extraction_jobs ==========
DROP POLICY IF EXISTS "Users can view their own jobs" ON "public"."extraction_jobs";
DROP POLICY IF EXISTS "Users can insert their own jobs" ON "public"."extraction_jobs";
DROP POLICY IF EXISTS "Service role full access on extraction_jobs" ON "public"."extraction_jobs";

-- ========== extracted_data ==========
DROP POLICY IF EXISTS "Users can view their own extracted data" ON "public"."extracted_data";
DROP POLICY IF EXISTS "Users can update their own extracted data" ON "public"."extracted_data";
DROP POLICY IF EXISTS "Users can delete their own extracted data" ON "public"."extracted_data";
DROP POLICY IF EXISTS "Service role full access on extracted_data" ON "public"."extracted_data";

-- ========== exports ==========
DROP POLICY IF EXISTS "Users can view their own exports" ON "public"."exports";
DROP POLICY IF EXISTS "Users can insert their own exports" ON "public"."exports";
DROP POLICY IF EXISTS "Users can delete their own exports" ON "public"."exports";
DROP POLICY IF EXISTS "Service role full access on exports" ON "public"."exports";


-- Recreate policies with correct logic and target roles

-- ========== users ==========
CREATE POLICY "Users can view their own user record"
  ON "public"."users" FOR SELECT
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id"); -- Use JWT sub claim

CREATE POLICY "Users can update their own user record"
  ON "public"."users" FOR UPDATE
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id")
  WITH CHECK ((select auth.jwt()->>'sub') = "user_id"); -- Use JWT sub claim

CREATE POLICY "Service role full access on users"
  ON "public"."users" FOR ALL
  TO service_role -- Explicitly target service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Anonymous cannot access users"
  ON "public"."users" FOR ALL
  TO anon
  USING (false) WITH CHECK (false);

GRANT SELECT, UPDATE ON "public"."users" TO authenticated;
GRANT ALL ON "public"."users" TO service_role;


-- ========== profiles ==========
CREATE POLICY "Users can view their own profile"
  ON "public"."profiles" FOR SELECT
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id"); -- Use JWT sub claim

CREATE POLICY "Users can update their own profile"
  ON "public"."profiles" FOR UPDATE
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id")
  WITH CHECK ((select auth.jwt()->>'sub') = "user_id"); -- Use JWT sub claim

CREATE POLICY "Service role full access on profiles"
  ON "public"."profiles" FOR ALL
  TO service_role -- Explicitly target service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Anonymous cannot access profiles"
  ON "public"."profiles" FOR ALL
  TO anon
  USING (false) WITH CHECK (false);

GRANT SELECT, UPDATE ON "public"."profiles" TO authenticated;
GRANT ALL ON "public"."profiles" TO service_role;


-- ========== user_usage ==========
CREATE POLICY "Users can view their own usage"
  ON "public"."user_usage" FOR SELECT
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id"); -- Use JWT sub claim

CREATE POLICY "Service role full access on user_usage"
  ON "public"."user_usage" FOR ALL
  TO service_role -- Explicitly target service_role
  USING (true) WITH CHECK (true);

GRANT SELECT ON "public"."user_usage" TO authenticated;
GRANT ALL ON "public"."user_usage" TO service_role;


-- ========== documents ==========
CREATE POLICY "Users can view their own documents"
  ON "public"."documents" FOR SELECT
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id"); -- Use JWT sub claim

CREATE POLICY "Users can insert their own documents"
  ON "public"."documents" FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.jwt()->>'sub') = "user_id"); -- Use JWT sub claim

CREATE POLICY "Users can update their own documents"
  ON "public"."documents" FOR UPDATE
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id") -- Use JWT sub claim
  WITH CHECK ((select auth.jwt()->>'sub') = "user_id"); -- Use JWT sub claim

CREATE POLICY "Users can delete their own documents"
  ON "public"."documents" FOR DELETE
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id"); -- Use JWT sub claim

CREATE POLICY "Service role full access on documents"
  ON "public"."documents" FOR ALL
  TO service_role -- Explicitly target service_role
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."documents" TO authenticated;
GRANT ALL ON "public"."documents" TO service_role;


-- ========== extraction_batches ==========
CREATE POLICY "Users can view their own batches"
  ON "public"."extraction_batches" FOR SELECT
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id"); -- Use JWT sub claim

CREATE POLICY "Users can insert their own batches"
  ON "public"."extraction_batches" FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.jwt()->>'sub') = "user_id"); -- Use JWT sub claim

CREATE POLICY "Users can update their own batches"
  ON "public"."extraction_batches" FOR UPDATE
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id") -- Use JWT sub claim
  WITH CHECK ((select auth.jwt()->>'sub') = "user_id"); -- Use JWT sub claim

CREATE POLICY "Users can delete their own batches"
  ON "public"."extraction_batches" FOR DELETE
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id"); -- Use JWT sub claim

CREATE POLICY "Service role full access on extraction_batches"
  ON "public"."extraction_batches" FOR ALL
  TO service_role -- Explicitly target service_role
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."extraction_batches" TO authenticated;
GRANT ALL ON "public"."extraction_batches" TO service_role;


-- ========== extraction_jobs ==========
CREATE POLICY "Users can view their own jobs"
  ON "public"."extraction_jobs" FOR SELECT
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id"); -- Use JWT sub claim

CREATE POLICY "Users can insert their own jobs"
  ON "public"."extraction_jobs" FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.jwt()->>'sub') = "user_id"); -- Use JWT sub claim

CREATE POLICY "Service role full access on extraction_jobs"
  ON "public"."extraction_jobs" FOR ALL
  TO service_role -- Explicitly target service_role
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT ON "public"."extraction_jobs" TO authenticated; -- Limit user actions
GRANT ALL ON "public"."extraction_jobs" TO service_role;


-- ========== extracted_data ==========
CREATE POLICY "Users can view their own extracted data"
  ON "public"."extracted_data" FOR SELECT
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id"); -- Use JWT sub claim

CREATE POLICY "Users can update their own extracted data"
  ON "public"."extracted_data" FOR UPDATE
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id") -- Use JWT sub claim
  WITH CHECK ((select auth.jwt()->>'sub') = "user_id"); -- Use JWT sub claim

CREATE POLICY "Users can delete their own extracted data"
  ON "public"."extracted_data" FOR DELETE
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id"); -- Use JWT sub claim

CREATE POLICY "Service role full access on extracted_data"
  ON "public"."extracted_data" FOR ALL
  TO service_role -- Explicitly target service_role
  USING (true) WITH CHECK (true);

GRANT SELECT, UPDATE, DELETE ON "public"."extracted_data" TO authenticated; -- Allow update/delete
GRANT ALL ON "public"."extracted_data" TO service_role;


-- ========== exports ==========
CREATE POLICY "Users can view their own exports"
  ON "public"."exports" FOR SELECT
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id"); -- Use JWT sub claim

CREATE POLICY "Users can insert their own exports"
  ON "public"."exports" FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.jwt()->>'sub') = "user_id"); -- Use JWT sub claim

CREATE POLICY "Users can delete their own exports"
  ON "public"."exports" FOR DELETE
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id"); -- Use JWT sub claim

CREATE POLICY "Service role full access on exports"
  ON "public"."exports" FOR ALL
  TO service_role -- Explicitly target service_role
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, DELETE ON "public"."exports" TO authenticated; -- Allow delete
GRANT ALL ON "public"."exports" TO service_role;