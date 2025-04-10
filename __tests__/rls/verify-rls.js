// Run with: node __tests__/rls/verify-rls.js
// A focused script to test RLS setup without running the full test suite

const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

// Test users
const USER_A = {
  id: "user_123",
  email: "user_a@test.com",
};

const USER_B = {
  id: "user_456",
  email: "user_b@test.com",
};

async function verifyRls() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey || !jwtSecret) {
    console.error("Missing Supabase environment variables. Please check your .env file.");
    process.exit(1);
  }

  console.log("🔍 RLS Verification Script");
  console.log("============================");
  console.log("This script will test if RLS is working properly with JWT tokens.\n");

  // Service client - bypasses RLS
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  // Create test data using service client
  console.log("Creating test data...");
  await ensureTestData(serviceClient);

  // 1. Test User A's client
  console.log("\n🧪 Testing User A's Authentication\n");
  const userAToken = generateJwtToken(USER_A.id, USER_A.email, jwtSecret);
  const userAClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userAToken}`,
      },
    },
  });

  // Verify auth context
  console.log("Checking auth context for User A...");
  await checkAuthContext(userAClient, USER_A.id);

  // Test RLS on the test table
  console.log("\nTesting RLS policies with User A...");
  await testRlsAccess(userAClient, USER_A.id, USER_B.id);

  // 2. Test User B's client
  console.log("\n🧪 Testing User B's Authentication\n");
  const userBToken = generateJwtToken(USER_B.id, USER_B.email, jwtSecret);
  const userBClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userBToken}`,
      },
    },
  });

  // Verify auth context
  console.log("Checking auth context for User B...");
  await checkAuthContext(userBClient, USER_B.id);

  // Test RLS on the test table
  console.log("\nTesting RLS policies with User B...");
  await testRlsAccess(userBClient, USER_B.id, USER_A.id);

  // 3. Test anonymous client
  console.log("\n🧪 Testing Anonymous Access\n");
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  
  // Verify auth context
  console.log("Checking auth context for anonymous user...");
  await checkAuthContext(anonClient, null);

  // Test RLS on the test table
  console.log("\nTesting RLS policies with anonymous user...");
  await testAnonAccess(anonClient);

  console.log("\n✅ Verification complete!");
}

// Generate JWT token
function generateJwtToken(userId, email, jwtSecret) {
  // Important: Supabase expects specific JWT claims format
  const payload = {
    aud: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 3600,
    sub: userId,
    email: email,
    role: "authenticated",
    iat: Math.floor(Date.now() / 1000),
  };

  console.log("Generated JWT payload:", payload);
  return jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });
}

// Check if the auth context is correctly set
async function checkAuthContext(client, expectedUserId) {
  try {
    // Get the value of auth.uid()
    const { data: authUid, error: authUidError } = await client.rpc('get_auth_uid');
    
    if (authUidError) {
      console.error("❌ Error getting auth.uid():", authUidError);
      console.log("Make sure you've created the get_auth_uid() function in your database.");
      return false;
    }
    
    console.log(`auth.uid() = "${authUid || 'null'}"`);
    
    if (expectedUserId === null) {
      console.log("✅ Anonymous user has no auth.uid (correct)");
      return true;
    }
    
    if (authUid === expectedUserId) {
      console.log(`✅ auth.uid() matches expected user ID "${expectedUserId}"`);
      return true;
    } else {
      console.error(`❌ auth.uid() doesn't match! Expected "${expectedUserId}", got "${authUid}"`);
      
      // Get all JWT claims for debugging
      const { data: claims, error: claimsError } = await client.rpc('get_auth_claims');
      if (!claimsError) {
        console.log("JWT claims:", claims);
      }
      return false;
    }
  } catch (err) {
    console.error("Error checking auth context:", err);
    return false;
  }
}

// Ensure test data exists
async function ensureTestData(serviceClient) {
  // Check if our test helper functions exist
  const { error: fnError } = await serviceClient.rpc('get_auth_uid');
  if (fnError && fnError.message.includes('function get_auth_uid() does not exist')) {
    console.log("Creating helper functions...");
    
    // Create the helper functions
    const { error } = await serviceClient.sql(`
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

      -- Create test table if it doesn't exist
      CREATE TABLE IF NOT EXISTS rls_test (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        content TEXT NOT NULL
      );

      -- Enable RLS
      ALTER TABLE rls_test ENABLE ROW LEVEL SECURITY;

      -- Create RLS policy
      DROP POLICY IF EXISTS "Users can view their own test data" ON rls_test;
      CREATE POLICY "Users can view their own test data"
        ON rls_test FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    `);
    
    if (error) {
      console.error("Error creating helper functions:", error);
      process.exit(1);
    }
  }

  // Insert test data
  const { error: insertError } = await serviceClient
    .from('rls_test')
    .upsert([
      { user_id: USER_A.id, content: "This belongs to User A" },
      { user_id: USER_B.id, content: "This belongs to User B" }
    ], { onConflict: 'user_id' });
  
  if (insertError) {
    console.error("Error inserting test data:", insertError);
  } else {
    console.log("✅ Test data created successfully");
  }
}

// Test if RLS is working for an authenticated user
async function testRlsAccess(client, ownerId, otherId) {
  // 1. User should be able to see their own records
  const { data: ownData, error: ownError } = await client
    .from('rls_test')
    .select('*')
    .eq('user_id', ownerId);
  
  if (ownError) {
    console.error(`❌ Error accessing own data:`, ownError);
  } else if (ownData.length === 0) {
    console.error(`❌ User cannot see their own data (expected to see records for ${ownerId})`);
  } else {
    console.log(`✅ User can see their own data: ${ownData.length} records`);
  }

  // 2. User should NOT be able to see other user's records
  const { data: otherData, error: otherError } = await client
    .from('rls_test')
    .select('*')
    .eq('user_id', otherId);
  
  if (otherError) {
    console.log(`✅ Access denied to other user's data with error: ${otherError.message}`);
  } else if (otherData.length === 0) {
    console.log(`✅ User cannot see other user's data (correct, empty result)`);
  } else {
    console.error(`❌ RLS FAILURE: User can see other user's data: ${otherData.length} records!`);
    console.log(otherData);
  }
}

// Test if RLS is working for anonymous users
async function testAnonAccess(client) {
  // Anonymous users should not see any records
  const { data, error } = await client
    .from('rls_test')
    .select('*');
  
  if (error && error.code === '42501') { // Permission denied
    console.log(`✅ Anonymous access correctly denied with permission error`);
  } else if (data && data.length === 0) {
    console.log(`✅ Anonymous user sees no data (correct)`);
  } else {
    console.error(`❌ RLS FAILURE: Anonymous user can see data: ${data?.length || 0} records!`);
    if (data && data.length > 0) {
      console.log(data);
    }
  }
}

verifyRls().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
}); 