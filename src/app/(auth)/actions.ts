"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, SupabaseNotConfiguredError } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";
import { safeNext } from "@/lib/safe-next";

export type AuthState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Set when we've emailed the person and they need to check their inbox. */
  sentTo?: string;
  values?: Record<string, string>;
};

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return siteUrl();
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

async function client() {
  try {
    return { supabase: await createClient() };
  } catch (e) {
    if (e instanceof SupabaseNotConfiguredError) return { error: e.message };
    throw e;
  }
}

const email = z.string().trim().toLowerCase().email("Enter a valid email address.");
const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use 72 characters or fewer.");

export async function signIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z
    .object({ email, password: z.string().min(1, "Enter your password.") })
    .safeParse({ email: form.get("email"), password: form.get("password") });
  const values = { email: String(form.get("email") ?? "") };
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const { supabase, error: configError } = await client();
  if (!supabase) return { error: configError, values };

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Please confirm your email first. We sent you a link when you signed up.", values };
    }
    return { error: "That email and password don't match. Try again or reset your password.", values };
  }
  redirect(safeNext(form.get("next")));
}

export async function signUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z
    .object({
      full_name: z.string().trim().min(1, "Tell us your name.").max(120, "That name is too long."),
      email,
      password,
    })
    .safeParse({ full_name: form.get("full_name"), email: form.get("email"), password: form.get("password") });
  const values = { full_name: String(form.get("full_name") ?? ""), email: String(form.get("email") ?? "") };
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const { supabase, error: configError } = await client();
  if (!supabase) return { error: configError, values };

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${await origin()}/auth/callback?next=/app`,
    },
  });
  if (error) {
    if (error.code === "weak_password") return { fieldErrors: { password: error.message }, values };
    if (error.code === "over_email_send_rate_limit") {
      return { error: "We've sent too many emails in the last hour. Please try again shortly.", values };
    }
    return { error: "We couldn't create your account. Please try again.", values };
  }

  // Email confirmation off: they're signed in straight away.
  if (data.session) redirect("/app");
  return { sentTo: parsed.data.email };
}

export async function requestPasswordReset(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z.object({ email }).safeParse({ email: form.get("email") });
  const values = { email: String(form.get("email") ?? "") };
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const { supabase, error: configError } = await client();
  if (!supabase) return { error: configError, values };

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await origin()}/auth/callback?next=/reset-password`,
  });
  // Same answer whether or not the account exists, so this form can't be used to find accounts.
  return { sentTo: parsed.data.email };
}

export async function updatePassword(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z
    .object({ password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: "The passwords don't match.", path: ["confirm"] })
    .safeParse({ password: form.get("password"), confirm: form.get("confirm") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const { supabase, error: configError } = await client();
  if (!supabase) return { error: configError };

  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) {
    return { error: "This reset link has expired. Request a new one from the sign-in page." };
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { fieldErrors: { password: "Choose a password you haven't used before." } };
    return { error: "We couldn't update your password. Please try again." };
  }
  redirect("/app");
}

export async function signInWithGoogle(form: FormData): Promise<void> {
  const { supabase } = await client();
  if (!supabase) redirect("/login?error=config");
  const next = safeNext(form.get("next"));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}
