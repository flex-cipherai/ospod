"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, requireWorkspace } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { hashInviteToken } from "@/lib/workspace-session";

export type InviteState = { link?: string; error?: string };

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return siteUrl();
  return `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
}

export async function createInvite(_prev: InviteState, form: FormData): Promise<InviteState> {
  const workspace = await requireWorkspace("admin");
  const profile = await requireProfile();
  const parsed = z
    .object({
      role: z.enum(["admin", "editor", "viewer"]),
      email: z.union([z.literal(""), z.string().trim().toLowerCase().email("Enter a valid email address.")]),
    })
    .safeParse({ role: form.get("role"), email: form.get("email") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const token = randomBytes(24).toString("base64url");
  const supabase = await createClient();
  const { error } = await supabase.from("workspace_invites").insert({
    workspace_id: workspace.id,
    role: parsed.data.role,
    email: parsed.data.email || null,
    token_hash: hashInviteToken(token),
    invited_by: profile.id,
  });
  if (error) return { error: "We couldn't create the invite. Please try again." };

  revalidatePath("/app/settings/team");
  return { link: `${await origin()}/invite/${token}` };
}

export async function revokeInvite(inviteId: string): Promise<void> {
  await requireWorkspace("admin");
  const supabase = await createClient();
  await supabase.from("workspace_invites").delete().eq("id", inviteId);
  revalidatePath("/app/settings/team");
}

export async function changeRole(userId: string, form: FormData): Promise<void> {
  const workspace = await requireWorkspace("admin");
  const role = z.enum(["admin", "editor", "viewer"]).safeParse(form.get("role"));
  if (!role.success) return;
  const supabase = await createClient();
  await supabase.from("workspace_members").update({ role: role.data }).eq("workspace_id", workspace.id).eq("user_id", userId);
  revalidatePath("/app/settings/team");
}

export async function removeMember(userId: string): Promise<void> {
  const workspace = await requireWorkspace("admin");
  const supabase = await createClient();
  await supabase.from("workspace_members").delete().eq("workspace_id", workspace.id).eq("user_id", userId);
  revalidatePath("/app/settings/team");
}
