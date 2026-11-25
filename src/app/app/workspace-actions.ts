"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getWorkspaces, getProfile, WORKSPACE_COOKIE } from "@/lib/auth";
import { rememberWorkspace } from "@/lib/workspace-session";
import { createClient } from "@/lib/supabase/server";

/** Switch which workspace the dashboard shows. */
export async function switchWorkspace(form: FormData): Promise<void> {
  const id = String(form.get("workspace_id") ?? "");
  const workspaces = await getWorkspaces();
  if (workspaces.some((w) => w.id === id)) await rememberWorkspace(id);
  redirect("/app");
}

/** Leave a workspace you were invited to (owners can't leave their own). */
export async function leaveWorkspace(workspaceId: string): Promise<void> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const supabase = await createClient();
  await supabase.from("workspace_members").delete().eq("workspace_id", workspaceId).eq("user_id", profile.id).neq("role", "owner");
  (await cookies()).delete(WORKSPACE_COOKIE);
  redirect("/app");
}
