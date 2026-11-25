"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Supabase in the browser, acting as the signed-in user. Used for direct file uploads. */
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
}
