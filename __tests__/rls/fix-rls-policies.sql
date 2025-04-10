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

-- Add functions to help debug RLS policies for storage buckets

-- Function to verify auth.uid()
CREATE OR REPLACE FUNCTION get_my_auth_uid()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid()::text;
$$;

-- Function to test storage.foldername extraction
CREATE OR REPLACE FUNCTION test_storage_foldername(path text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT (storage.foldername(path))[1];
$$;

-- Function to debug storage RLS evaluation
CREATE OR REPLACE FUNCTION debug_storage_rls_check(user_id text, path text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT user_id = (storage.foldername(path))[1];
$$;

-- Temporary debugging policy that logs the values
-- Comment in/out as needed for debugging
/*
DROP POLICY IF EXISTS "Users can read their own files" ON storage.objects;
CREATE POLICY "TEMP DEBUG Users can read their own files"
ON storage.objects
FOR SELECT
USING (
  (SELECT true FROM pg_catalog.pg_stat_statements WHERE pg_notify('debug', 
    'auth.uid: ' || COALESCE(auth.uid()::text, 'NULL') || 
    ', path: ' || name || 
    ', folder: ' || COALESCE((storage.foldername(name))[1], 'NULL')
  ) LIMIT 1) IS NOT NULL OR
  auth.uid()::text = (storage.foldername(name))[1]
);
*/

-- Simplified temporary debugging policy
-- Comment in/out as needed for debugging
/*
DROP POLICY IF EXISTS "Users can read their own files" ON storage.objects;
CREATE POLICY "TEMP DEBUG Users can read any files"
ON storage.objects
FOR SELECT
USING (
  true
);
*/

-- Correct policy with better error handling
DROP POLICY IF EXISTS "Users can read their own files" ON storage.objects;
CREATE POLICY "Users can read their own files"
ON storage.objects
FOR SELECT
USING (
  -- Properly handle cases where storage.foldername might return NULL
  (storage.foldername(name))[1] IS NOT NULL AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Correct INSERT policy with better error handling
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  -- Properly handle cases where storage.foldername might return NULL
  (storage.foldername(name))[1] IS NOT NULL AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Correct UPDATE policy with better error handling
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
CREATE POLICY "Users can update their own files"
ON storage.objects
FOR UPDATE
USING (
  (storage.foldername(name))[1] IS NOT NULL AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  (storage.foldername(name))[1] IS NOT NULL AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Correct DELETE policy with better error handling
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
USING (
  (storage.foldername(name))[1] IS NOT NULL AND
  auth.uid()::text = (storage.foldername(name))[1]
); 