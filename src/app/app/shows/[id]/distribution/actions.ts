"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/auth";
import { PLATFORMS } from "@/lib/publishing";

const platformIds = PLATFORMS.map((p) => p.id) as [string, ...string[]];

/** Records where the show is listed: submitted, live (with its listing link), or not yet. */
export async function setPlatformStatus(showId: string, platform: string, form: FormData): Promise<void> {
  const workspace = await requireWorkspace("editor");
  const parsed = z
    .object({
      platform: z.enum(platformIds),
      status: z.enum(["none", "submitted", "live"]),
      url: z.union([z.literal(""), z.string().trim().url().max(500)]),
    })
    .safeParse({ platform, status: form.get("status"), url: (form.get("url") as string | null) ?? "" });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { data: show } = await supabase.from("shows").select("id").eq("id", showId).eq("workspace_id", workspace.id).maybeSingle();
  if (!show) return;

  if (parsed.data.status === "none") {
    await supabase.from("show_platforms").delete().eq("show_id", showId).eq("platform", parsed.data.platform);
  } else {
    await supabase.from("show_platforms").upsert({
      show_id: showId,
      platform: parsed.data.platform,
      status: parsed.data.status,
      url: parsed.data.url || null,
      updated_at: new Date().toISOString(),
    });
  }
  revalidatePath(`/app/shows/${showId}/distribution`);
}
