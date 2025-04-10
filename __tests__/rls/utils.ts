import { SupabaseClient, createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import jwt from 'jsonwebtoken';
import { afterAll, beforeAll, describe, it } from "vitest";

dotenv.config();

// Skip tests unless explicitly running RLS tests
export const isRlsTest = process.env.RUN_RLS_TESTS === "true";

export interface TestUser {
  id: string;
  email: string;
}

// Test users for RLS testing with proper UUID format
export const USER_A: TestUser = {
  id: "123e4567-e89b-12d3-a456-426614174000", // Valid UUID v4 format
  email: "user_a@test.com",
};

export const USER_B: TestUser = {
  id: "223e4567-e89b-12d3-a456-426614174001", // Valid UUID v4 format
  email: "user_b@test.com",
};

// Supabase client factory for different roles
export function createSupabaseClient(options: {
  role?: "anon" | "authenticated" | "service_role";
  userId?: string;
  email?: string;
}): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    throw new Error(
      "Missing Supabase environment variables. Please check your .env file."
    );
  }

  const { role = "anon", userId, email } = options;

  // For service_role, use the service role key
  if (role === "service_role") {
    return createClient(supabaseUrl, supabaseServiceKey);
  }

  // For authenticated users, generate JWT claims
  if (role === "authenticated" && userId && email) {
    // The token format is critical for RLS to work correctly
    const token = generateJwtToken(userId, email);
    console.log(`Creating authenticated client for user ${userId} with token:`, token);
    
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
  }

  // For anonymous users, use the anon key
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Generate a properly formatted JWT token for Supabase
function generateJwtToken(userId: string, email: string): string {
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("Missing SUPABASE_JWT_SECRET environment variable. Please check your .env file.");
  }

  // Important: Supabase expects specific JWT claims format
  // The 'sub' claim must match user_id in tables exactly
  // auth.uid() in Postgres will extract this value
  const payload = {
    aud: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
    sub: userId,
    email: email,
    role: "authenticated",
    // Include additional claims that Supabase expects
    iat: Math.floor(Date.now() / 1000),
    // Add any other required claims here
  };

  console.log("Generated JWT payload:", payload);

  // Sign the token with the Supabase JWT secret
  return jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });
}

// Add a function to verify JWT token and check what auth.uid() would return
export async function verifyAuthContext(client: SupabaseClient, expectedUserId: string): Promise<boolean> {
  try {
    // This RPC should be created in your Supabase database
    const { data, error } = await client.rpc('get_auth_uid');
    
    console.log(`Auth context check for expected userId=${expectedUserId}:`, { data, error });
    
    if (error) {
      console.error("Failed to get auth context:", error);
      // Check if we need to create the function
      console.log("You may need to create the get_auth_uid function in Supabase. Run this SQL:");
      console.log(`
      create or replace function get_auth_uid() returns text as $$
      begin
        return auth.uid();
      end;
      $$ language plpgsql security definer;
      `);
      return false;
    }
    
    return data === expectedUserId;
  } catch (err) {
    console.error("Error verifying auth context:", err);
    return false;
  }
}

// Type for the clients returned by setupRlsTest
interface RlsTestClients {
  serviceClient: SupabaseClient;
  userAClient: SupabaseClient;
  userBClient: SupabaseClient;
  anonClient: SupabaseClient;
}

// Setup helper for all RLS tests
export function setupRlsTest(tableName: string): RlsTestClients | null {
  if (!isRlsTest) {
    describe.skip(`${tableName} RLS tests`, () => {
      it("Skipped", () => {});
    });
    return null;
  }

  // Create clients with proper typing
  const serviceClient = createSupabaseClient({ role: "service_role" });
  const userAClient = createSupabaseClient({
    role: "authenticated",
    userId: USER_A.id,
    email: USER_A.email,
  });
  const userBClient = createSupabaseClient({
    role: "authenticated",
    userId: USER_B.id,
    email: USER_B.email,
  });
  const anonClient = createSupabaseClient({ role: "anon" });

  beforeAll(async () => {
    // Verify authentication is working correctly before tests
    console.log("Verifying User A authentication...");
    await verifyAuthContext(userAClient, USER_A.id);
    
    console.log("Verifying User B authentication...");
    await verifyAuthContext(userBClient, USER_B.id);
    
    console.log("Verifying anon client has no auth...");
    await verifyAuthContext(anonClient, "");
  });

  afterAll(async () => {
    // Clean up test data if needed
    await serviceClient.auth.signOut();
    await userAClient.auth.signOut();
    await userBClient.auth.signOut();
    await anonClient.auth.signOut();
  });

  return {
    serviceClient,
    userAClient,
    userBClient,
    anonClient,
  };
} 