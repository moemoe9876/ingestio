"use server";

import { Database } from "@/types";
import { createClient, createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase client for use in server components and server actions
 * This client has the user's session and should be used for regular operations
 */
export function createServerClient() {
  const cookieStore = cookies();
  
  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set(name, value, options);
          } catch (error) {
            // The cookies.set function throws in middleware or when cookies are already sent
            // This catch is specifically for middleware cases
          }
        },
        remove(name, options) {
          try {
            cookieStore.set(name, "", { ...options, maxAge: 0 });
          } catch (error) {
            // The cookies.set function throws in middleware or when cookies are already sent
            // This catch is specifically for middleware cases
          }
        }
      }
    }
  );
}

/**
 * Creates an admin Supabase client with privileged access
 * This should be used only for administrative operations that require elevated permissions
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
} 