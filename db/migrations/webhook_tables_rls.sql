-- Enable RLS on processed_clerk_events table
ALTER TABLE processed_clerk_events ENABLE ROW LEVEL SECURITY;

-- Create deny all policy for public role
CREATE POLICY deny_all_processed_clerk_events 
ON processed_clerk_events
FOR ALL
USING (false);

-- Create policy to allow service_role access to all rows
CREATE POLICY service_role_access_processed_clerk_events
ON processed_clerk_events
FOR ALL
TO service_role
USING (true);

-- Enable RLS on processed_stripe_events table
ALTER TABLE processed_stripe_events ENABLE ROW LEVEL SECURITY;

-- Create deny all policy for public role
CREATE POLICY deny_all_processed_stripe_events
ON processed_stripe_events
FOR ALL
USING (false);

-- Create policy to allow service_role access to all rows
CREATE POLICY service_role_access_processed_stripe_events 
ON processed_stripe_events
FOR ALL
TO service_role
USING (true); 