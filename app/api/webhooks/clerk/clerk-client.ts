import { Database } from '@/types/supabase-types';
import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client with the Clerk session token
 * This allows Supabase RLS policies to use the user's Clerk ID
 */
export function createClerkSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    }
  );
}

/**
 * Creates a Supabase admin client for webhook operations
 * This bypasses RLS and operates with full admin privileges
 */
export function createClerkAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
} 