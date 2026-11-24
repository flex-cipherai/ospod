import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PlanId } from "@/lib/plans";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  platform_role: "user" | "super_admin";
};

export type Workspace = {
  id: string;
  name: string;
  plan: PlanId;
  plan_status: "trialing" | "active" | "past_due" | "canceled";
  trial_ends_at: string | null;
  founding_member: boolean;
  role: "owner" | "admin" | "editor" | "viewer";
};

/**
 * The signed-in person's profile, or null. Reads the session cookie, so call it
 * only from components inside a <Suspense> boundary, Server Actions or Route Handlers.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, platform_role")
    .eq("id", userId)
    .maybeSingle();
  return (data as Profile | null) ?? null;
});

export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

/** Super admin pages answer "not found" to everyone else, so they don't reveal they exist. */
export async function requireSuperAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.platform_role !== "super_admin") notFound();
  return profile;
}

/** The workspace the person works in. For now that's the first one they joined. */
export const getWorkspace = cache(async (): Promise<Workspace | null> => {
  const profile = await getProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("workspace_members")
    .select("role, created_at, workspaces (id, name, plan, plan_status, trial_ends_at, founding_member)")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const ws = data?.workspaces as unknown as Omit<Workspace, "role"> | null;
  if (!data || !ws) return null;
  return { ...ws, role: data.role as Workspace["role"] };
});

export function firstName(profile: Pick<Profile, "full_name" | "email">): string {
  return profile.full_name?.trim().split(/\s+/)[0] || profile.email.split("@")[0];
}
