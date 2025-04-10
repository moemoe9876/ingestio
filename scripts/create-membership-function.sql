-- SQL script to create an admin function for updating membership values
-- Run this in the Supabase SQL Editor

-- Create the admin function for updating memberships
CREATE OR REPLACE FUNCTION admin_update_memberships(old_membership text, new_membership text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER -- Run with privileges of the creator
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE profiles 
  SET membership = new_membership::membership
  WHERE membership::text = old_membership;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Grant execute privileges to authenticated users (optional, depends on your security needs)
-- GRANT EXECUTE ON FUNCTION admin_update_memberships TO authenticated;

-- For testing, run this query to see how many rows would be affected:
SELECT COUNT(*) FROM profiles WHERE membership::text = 'free';

-- Manual update command (alternative to the function):
-- UPDATE profiles SET membership = 'starter' WHERE membership = 'free'; 