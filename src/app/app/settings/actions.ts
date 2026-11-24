"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace, requireProfile } from "@/lib/auth";

export type SettingsState = { ok?: string; error?: string };

export async function updateProfile(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const profile = await requireProfile();
  const parsed = z.string().trim().min(1, "Enter your name.").max(120, "That name is too long.").safeParse(form.get("full_name"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: parsed.data }).eq("id", profile.id);
  if (error) return { error: "We couldn't save your name. Please try again." };
  revalidatePath("/app", "layout");
  return { ok: "Saved." };
}

export async function renameWorkspace(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const workspace = await getWorkspace();
  if (!workspace) return { error: "We couldn't find your workspace." };
  if (workspace.role !== "owner" && workspace.role !== "admin") {
    return { error: "Only the workspace owner or an admin can rename it." };
  }
  const parsed = z.string().trim().min(1, "Enter a name.").max(80, "Use 80 characters or fewer.").safeParse(form.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("workspaces").update({ name: parsed.data }).eq("id", workspace.id);
  if (error) return { error: "We couldn't rename the workspace. Please try again." };
  revalidatePath("/app", "layout");
  return { ok: "Saved." };
}
