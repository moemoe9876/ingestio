"use client";

import { Database } from "@/types";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for use in browser environments
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
} 