import { createClient } from "@supabase/supabase-js";

/** Supabase as a signed-out visitor, without cookies. For public feeds and media. */
export function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase isn't configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
