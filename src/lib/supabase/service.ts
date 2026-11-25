/**
 * Supabase with the secret key: bypasses row level security. Only for trusted server
 * jobs (the processing pipeline on Trigger.dev, billing webhooks). Never import it
 * into anything that runs in the browser.
 */
import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set for server jobs");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
