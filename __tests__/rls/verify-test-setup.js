// Script to verify test data ownership is correct
// Run with: node __tests__/rls/verify-test-setup.js

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

// Test users from utils.ts
const USER_A = {
  id: "user_123",
  email: "user_a@test.com",
};

const USER_B = {
  id: "user_456",
  email: "user_b@test.com",
};

async function verifyTestSetup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase environment variables. Please check your .env file.");
    process.exit(1);
  }

  // Create service client
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  console.log("Verifying test data ownership...");
  
  // Check users
  const { data: users, error: usersError } = await serviceClient
    .from("users")
    .select("*")
    .in("user_id", [USER_A.id, USER_B.id]);
  
  if (usersError) {
    console.error("Error fetching users:", usersError);
    process.exit(1);
  }

  if (users.length < 2) {
    console.warn("Warning: Not all test users exist in the database");
    console.log("Found users:", users);
  } else {
    console.log("✅ Users check passed: Both test users exist");
  }

  // Check profiles
  const { data: profiles, error: profilesError } = await serviceClient
    .from("profiles")
    .select("*")
    .in("user_id", [USER_A.id, USER_B.id]);
  
  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
    process.exit(1);
  }
  
  if (profiles.length < 2) {
    console.warn("Warning: Not all test profiles exist in the database");
    console.log("Found profiles:", profiles);
  } else {
    console.log("✅ Profiles check passed: Both test profiles exist");
  }

  // Check documents
  const { data: docs, error: docsError } = await serviceClient
    .from("documents")
    .select("*")
    .in("user_id", [USER_A.id, USER_B.id]);
  
  if (docsError) {
    console.error("Error fetching documents:", docsError);
  } else {
    console.log(`Found ${docs.length} documents:`, 
      docs.map(d => `${d.id.slice(0, 8)}... (owner: ${d.user_id})`));
  }

  // Check user_usage
  const { data: usage, error: usageError } = await serviceClient
    .from("user_usage")
    .select("*")
    .in("user_id", [USER_A.id, USER_B.id]);
  
  if (usageError) {
    console.error("Error fetching usage:", usageError);
  } else {
    console.log(`Found ${usage.length} usage records:`, 
      usage.map(u => `${u.id.slice(0, 8)}... (owner: ${u.user_id})`));
  }

  // Test applying RLS policies
  console.log("\nTesting RLS policy application...");
  
  // Create test client for User A
  const jwt = generateJwtToken(USER_A.id, USER_A.email);
  const userAClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
  });

  // Test if User A can see their documents
  const { data: userADocs, error: userADocsError } = await userAClient
    .from("documents")
    .select("*");
  
  if (userADocsError) {
    console.error("Error: User A cannot see their documents due to RLS issues:", userADocsError);
  } else {
    console.log(`✅ User A can see ${userADocs.length} of their documents`);
    
    // Check if any documents with USER_B.id are visible
    const userBDocsVisibleToA = userADocs.filter(d => d.user_id === USER_B.id);
    if (userBDocsVisibleToA.length > 0) {
      console.error("❌ RLS FAILURE: User A can see User B's documents!");
    } else {
      console.log("✅ User A cannot see User B's documents (correct)");
    }
  }

  console.log("\nVerification complete. If there are warnings or errors, fix data setup issues before running tests.");
}

// JWT token generation (copied from utils.ts)
function generateJwtToken(userId, email) {
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("Missing SUPABASE_JWT_SECRET environment variable");
  }

  const payload = {
    sub: userId,
    email: email,
    role: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 60 // 1 minute expiration
  };

  // Using node's crypto since we don't have jsonwebtoken library
  // This is a simplified version - in real verification use a proper JWT library
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const payload64 = Buffer.from(JSON.stringify(payload)).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
  const signature = "simulated_signature"; // Simplified for demonstration
  
  return `${header}.${payload64}.${signature}`;
}

verifyTestSetup().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
}); 