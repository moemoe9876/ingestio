-- Apply RLS Policies for MVP Tables

-- ========== user_usage ==========
ALTER TABLE "public"."user_usage" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage"
  ON "public"."user_usage" FOR SELECT
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id");

-- Service role needs to insert/update usage records
CREATE POLICY "Service role full access on user_usage"
  ON "public"."user_usage" FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON "public"."user_usage" TO authenticated;
GRANT ALL ON "public"."user_usage" TO service_role;


-- ========== documents ==========
ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents"
  ON "public"."documents" FOR SELECT
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id");

CREATE POLICY "Users can insert their own documents"
  ON "public"."documents" FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.jwt()->>'sub') = "user_id");

CREATE POLICY "Users can update their own documents"
  ON "public"."documents" FOR UPDATE
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id")
  WITH CHECK ((select auth.jwt()->>'sub') = "user_id"); -- Prevent changing owner

CREATE POLICY "Users can delete their own documents"
  ON "public"."documents" FOR DELETE
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id");

CREATE POLICY "Service role full access on documents"
  ON "public"."documents" FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."documents" TO authenticated;
GRANT ALL ON "public"."documents" TO service_role;


-- ========== extraction_batches ==========
ALTER TABLE "public"."extraction_batches" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own batches"
  ON "public"."extraction_batches" FOR SELECT
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id");

CREATE POLICY "Users can insert their own batches"
  ON "public"."extraction_batches" FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.jwt()->>'sub') = "user_id");

CREATE POLICY "Users can update their own batches"
  ON "public"."extraction_batches" FOR UPDATE
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id")
  WITH CHECK ((select auth.jwt()->>'sub') = "user_id");

CREATE POLICY "Users can delete their own batches" -- Added Delete
  ON "public"."extraction_batches" FOR DELETE
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id");

CREATE POLICY "Service role full access on extraction_batches"
  ON "public"."extraction_batches" FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."extraction_batches" TO authenticated;
GRANT ALL ON "public"."extraction_batches" TO service_role;


-- ========== extraction_jobs ==========
ALTER TABLE "public"."extraction_jobs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own jobs"
  ON "public"."extraction_jobs" FOR SELECT
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id");

CREATE POLICY "Users can insert their own jobs"
  ON "public"."extraction_jobs" FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.jwt()->>'sub') = "user_id");

-- Users generally shouldn't update/delete jobs directly, handled by backend
-- CREATE POLICY "Users can update their own jobs" ON "public"."extraction_jobs" FOR UPDATE ...
-- CREATE POLICY "Users can delete their own jobs" ON "public"."extraction_jobs" FOR DELETE ...

CREATE POLICY "Service role full access on extraction_jobs"
  ON "public"."extraction_jobs" FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT ON "public"."extraction_jobs" TO authenticated; -- Limit user actions
GRANT ALL ON "public"."extraction_jobs" TO service_role;


-- ========== extracted_data ==========
ALTER TABLE "public"."extracted_data" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own extracted data"
  ON "public"."extracted_data" FOR SELECT
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id");

-- Users might update data during review
CREATE POLICY "Users can update their own extracted data"
  ON "public"."extracted_data" FOR UPDATE
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id")
  WITH CHECK ((select auth.jwt()->>'sub') = "user_id");

-- Users might delete results if they delete the document/job
CREATE POLICY "Users can delete their own extracted data"
  ON "public"."extracted_data" FOR DELETE
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id");

CREATE POLICY "Service role full access on extracted_data"
  ON "public"."extracted_data" FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, UPDATE, DELETE ON "public"."extracted_data" TO authenticated; -- Allow update/delete
GRANT ALL ON "public"."extracted_data" TO service_role;


-- ========== exports ==========
ALTER TABLE "public"."exports" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own exports"
  ON "public"."exports" FOR SELECT
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id");

CREATE POLICY "Users can insert their own exports"
  ON "public"."exports" FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.jwt()->>'sub') = "user_id");

-- Users might delete export records
CREATE POLICY "Users can delete their own exports"
  ON "public"."exports" FOR DELETE
  TO authenticated
  USING ((select auth.jwt()->>'sub') = "user_id");

CREATE POLICY "Service role full access on exports"
  ON "public"."exports" FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, DELETE ON "public"."exports" TO authenticated; -- Allow delete
GRANT ALL ON "public"."exports" TO service_role; 