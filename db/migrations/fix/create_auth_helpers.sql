-- Create helper functions to diagnose authentication issues

-- Function to return auth.uid() for verification
CREATE OR REPLACE FUNCTION get_auth_uid()
RETURNS TEXT AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to return current auth claims for debugging
CREATE OR REPLACE FUNCTION get_auth_claims()
RETURNS JSONB AS $$
BEGIN
  RETURN current_setting('request.jwt.claims', TRUE)::JSONB;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test if a user is properly authenticated
CREATE OR REPLACE FUNCTION test_auth_check(expected_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- This is what RLS policies check
  RETURN auth.uid() = expected_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a test table to verify RLS is working
CREATE TABLE IF NOT EXISTS rls_test (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  content TEXT NOT NULL
);

-- Enable RLS on the test table
ALTER TABLE rls_test ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for the test table
DROP POLICY IF EXISTS "Users can view their own test data" ON rls_test;
CREATE POLICY "Users can view their own test data"
  ON rls_test FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert test data
INSERT INTO rls_test (user_id, content)
VALUES 
  ('user_123', 'This belongs to User A'),
  ('user_456', 'This belongs to User B')
ON CONFLICT DO NOTHING; 