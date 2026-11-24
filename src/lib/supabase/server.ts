import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "@/lib/env";

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super("Ospod isn't connected to its database yet. Set the Supabase environment variables.");
  }
}

/** Supabase client for Server Components, Server Actions and Route Handlers, acting as the signed-in user. */
export async function createClient() {
  // Read cookies first: it marks the caller as request-time, so it is never prerendered at build time.
  const cookieStore = await cookies();
  const config = supabaseConfig();
  if (!config) throw new SupabaseNotConfiguredError();

  return createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes the session cookie on every request, so this is safe to ignore.
        }
      },
    },
  });
}
