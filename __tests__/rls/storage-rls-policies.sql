-- This script sets up Row Level Security policies for the 'documents' and 'exports' storage buckets
-- Run this in your Supabase SQL editor

-- ==========================================
-- Storage Buckets Configuration
-- ==========================================

-- Update 'documents' bucket configuration
UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 10485760, -- 10 MB limit (10 * 1024 * 1024 bytes)
  allowed_mime_types = ARRAY[
    'application/pdf', 
    'image/png', 
    'image/jpeg', 
    'image/webp'
  ]
WHERE id = 'documents';

-- Update 'exports' bucket configuration
UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 52428800, -- 50 MB limit (50 * 1024 * 1024 bytes)
  allowed_mime_types = ARRAY[
    'application/json', 
    'text/csv', 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]
WHERE id = 'exports';

-- ==========================================
-- First, remove any existing policies
-- ==========================================

DROP POLICY IF EXISTS "Users can only access their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can only insert their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- ==========================================
-- RLS Policies for the storage.objects table
-- ==========================================

-- Enable Row Level Security
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1. SELECT policy - allows users to retrieve their own files
CREATE POLICY "Users can read their own files"
ON storage.objects
FOR SELECT
USING (
  -- Use auth.uid() for Supabase auth
  -- storage.foldername returns an array of folder path components
  -- The first element should match the user_id
  -- Properly handle cases where storage.foldername might return NULL
  (storage.foldername(name))[1] IS NOT NULL AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 2. INSERT policy - allows users to upload files to their own folder
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  -- Properly handle cases where storage.foldername might return NULL
  (storage.foldername(name))[1] IS NOT NULL AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. UPDATE policy - allows users to update their own files
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

-- 4. DELETE policy - allows users to delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
USING (
  (storage.foldername(name))[1] IS NOT NULL AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ==========================================
-- Verify policies are in place
-- ==========================================

-- You can check the policies with:
-- SELECT * FROM pg_policies WHERE tablename = 'objects';

-- ==========================================
-- Important Notes:
-- ==========================================
-- 1. This assumes each file path starts with the user_id in the first folder segment
--    Example: '123e4567-e89b-12d3-a456-426614174000/documents/file.pdf'
--
-- 2. Service role connections bypass RLS entirely
--
-- 3. Ensure your application properly structures file paths to include user ID as
--    the first path segment - user ID is the UUID string from auth.uid()
--
-- 4. Anonymous users have no access to these private buckets since both are set
--    with public = false
--
-- 5. auth.uid() returns a UUID, so make sure paths start with the UUID string format
--    For example: '123e4567-e89b-12d3-a456-426614174000/filename.pdf' 