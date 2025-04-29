"use server";

import { Database } from "@/types";
import { auth } from "@clerk/nextjs/server";
import { type CookieOptions, createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Creates a Supabase client for use in server components and server actions
 * This client has the user's session and should be used for regular operations
 */
export async function createServerClient() {
  const cookieStore = cookies();
  
  // Get Clerk auth context to get userId
  const { userId } = await auth();
  
  // For storage operations that require authentication, we need to specify the user ID
  // in a format that Supabase RLS policies can understand
  const authToken = userId ? {
    global: {
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        // Set a custom header so we can still identify the user client-side
        "x-user-id": userId,
      },
    },
  } : undefined;
  
  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      ...authToken,
      cookies: {
        async getAll() {
          return (await cookieStore).getAll();
        },
        setAll(cookiesToSet: { name: string, value: string, options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(async ({ name, value, options }) =>
              (await cookieStore).set(name, value, options)
            );
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            // Also handles potential errors in specific environments (like middleware)
            console.warn("setAll cookie error ignored in createServerClient:", error);
          }
        },
      }
    }
  );
}

/**
 * Creates an admin Supabase client with privileged access
 * This should be used only for administrative operations that require elevated permissions
 */
export async function createAdminClient() {
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