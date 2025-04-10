-- This SQL script creates diagnostic functions for testing RLS policies
-- Run this directly in the Supabase SQL Editor 

-- Function to verify auth.uid() within the current auth context
-- Returns the auth.uid() value as text to avoid UUID format issues
CREATE OR REPLACE FUNCTION public.get_my_auth_uid()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  auth_id uuid;
BEGIN
  auth_id := auth.uid();
  RETURN auth_id::text;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- Make function accessible to all authenticated users and the anon role
GRANT EXECUTE ON FUNCTION public.get_my_auth_uid() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_auth_uid() TO anon;

-- Function to test storage.foldername extraction
CREATE OR REPLACE FUNCTION public.test_storage_foldername(path text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, storage
STABLE
AS $$
  SELECT (storage.foldername(path))[1];
$$;

-- Make function accessible to all roles
GRANT EXECUTE ON FUNCTION public.test_storage_foldername(path text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_storage_foldername(path text) TO anon;
GRANT EXECUTE ON FUNCTION public.test_storage_foldername(path text) TO service_role;

-- Function to debug storage RLS evaluation
CREATE OR REPLACE FUNCTION public.debug_storage_rls_check(user_id text, path text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, storage
STABLE
AS $$
  SELECT user_id = (storage.foldername(path))[1];
$$;

-- Make function accessible to all roles
GRANT EXECUTE ON FUNCTION public.debug_storage_rls_check(user_id text, path text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_storage_rls_check(user_id text, path text) TO anon;
GRANT EXECUTE ON FUNCTION public.debug_storage_rls_check(user_id text, path text) TO service_role;

-- Verify functions are accessible
SELECT 'get_my_auth_uid exists' as check, 
       EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_my_auth_uid') as result;
SELECT 'test_storage_foldername exists' as check, 
       EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'test_storage_foldername') as result;
SELECT 'debug_storage_rls_check exists' as check, 
       EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'debug_storage_rls_check') as result; 