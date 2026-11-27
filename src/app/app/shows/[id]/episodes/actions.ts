"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { tasks } from "@trigger.dev/sdk";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/auth";
import {
  PART_SIZE,
  abortMultipartUpload,
  completeMultipartUpload,
  deleteObjects,
  mediaKeys,
  r2Config,
  signUploadPart,
  startMultipartUpload,
} from "@/lib/media/r2";
import type { processEpisode } from "@/trigger/process-episode";
import { isStuck } from "@/lib/processing";

const MAX_AUDIO_BYTES = 2 * 1024 ** 3; // 2 GB
const MAX_VIDEO_BYTES = 25 * 1024 ** 3; // 25 GB
const UUID = /^[0-9a-f-]{36}$/i;

const EXTENSIONS: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/x-m4a": "m4a",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
  "audio/ogg": "ogg",
  "audio/aiff": "aiff",
  "audio/x-aiff": "aiff",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/x-matroska": "mkv",
  "video/webm": "webm",
};

/** "my_episode-final.v2.mp3" → "My episode final v2" */
function titleFromFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();
  const t = base.charAt(0).toUpperCase() + base.slice(1);
  return (t || "New episode").slice(0, 300);
}

export type StartUploadResult =
  | { ok: true; episodeId: string; partSize: number; partCount: number }
  | { ok: false; message: string };

export async function startEpisodeUpload(
  showId: string,
  file: { name: string; size: number; type: string },
): Promise<StartUploadResult> {
  const workspace = await requireWorkspace("editor");
  if (!UUID.test(showId)) return { ok: false, message: "We couldn't find that show." };
  if (!r2Config()) return { ok: false, message: "Uploading isn't switched on yet. Media storage still needs to be connected." };

  const ext = EXTENSIONS[file.type] ?? file.name.split(".").pop()?.toLowerCase();
  const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : null;
  if (!kind || !ext || !/^[a-z0-9]{2,5}$/.test(ext)) {
    return { ok: false, message: "That file type isn't supported. Upload an MP3, WAV, M4A, FLAC, MP4 or MOV file." };
  }
  if (file.size <= 0) return { ok: false, message: "That file is empty." };
  if (kind === "audio" && file.size > MAX_AUDIO_BYTES) return { ok: false, message: "Audio files can be up to 2 GB. Try exporting as MP3 or M4A." };
  if (kind === "video" && file.size > MAX_VIDEO_BYTES) return { ok: false, message: "Video files can be up to 25 GB." };
  if (kind === "video" && workspace.plan === "starter" && workspace.plan_status !== "trialing") {
    return { ok: false, message: "Video podcasts are included from the Creator plan. Upgrade to upload video." };
  }

  const supabase = await createClient();
  const { data: show } = await supabase.from("shows").select("id").eq("id", showId).eq("workspace_id", workspace.id).maybeSingle();
  if (!show) return { ok: false, message: "We couldn't find that show." };

  const { data: episode, error } = await supabase
    .from("episodes")
    .insert({
      show_id: showId,
      title: titleFromFilename(file.name),
      title_auto: true,
      status: "draft",
      media_kind: kind,
      original_filename: file.name.slice(0, 255),
      original_bytes: file.size,
      original_mime: file.type || null,
      processing_stage: "uploading",
    })
    .select("id")
    .single();
  if (error || !episode) return { ok: false, message: "We couldn't start the upload. Please try again." };

  try {
    const key = mediaKeys(workspace.id, showId, episode.id).original(ext);
    const uploadId = await startMultipartUpload(key, file.type || "application/octet-stream");
    await supabase.from("episodes").update({ original_key: key, upload_id: uploadId }).eq("id", episode.id);
    return { ok: true, episodeId: episode.id, partSize: PART_SIZE, partCount: Math.ceil(file.size / PART_SIZE) };
  } catch (e) {
    console.error("startEpisodeUpload", e);
    await supabase.from("episodes").delete().eq("id", episode.id);
    return { ok: false, message: "We couldn't reach media storage. Please try again in a moment." };
  }
}

async function uploadingEpisode(episodeId: string) {
  const workspace = await requireWorkspace("editor");
  if (!UUID.test(episodeId)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("episodes")
    .select("id, show_id, original_key, upload_id, audio_key, original_bytes, processing_stage, updated_at, shows!inner(workspace_id)")
    .eq("id", episodeId)
    .eq("shows.workspace_id", workspace.id)
    .maybeSingle();
  return data ? { supabase, workspace, episode: data } : null;
}

/** Signed addresses the browser uploads each part to. */
export async function signEpisodeParts(episodeId: string, partNumbers: number[]): Promise<{ ok: true; urls: Record<number, string> } | { ok: false }> {
  const found = await uploadingEpisode(episodeId);
  if (!found || found.episode.processing_stage !== "uploading" || !found.episode.original_key || !found.episode.upload_id) return { ok: false };
  const max = Math.ceil(Number(found.episode.original_bytes) / PART_SIZE);
  const wanted = partNumbers.filter((n) => Number.isInteger(n) && n >= 1 && n <= max).slice(0, 50);
  const urls: Record<number, string> = {};
  await Promise.all(wanted.map(async (n) => (urls[n] = await signUploadPart(found.episode.original_key!, found.episode.upload_id!, n))));
  return { ok: true, urls };
}

export async function finishEpisodeUpload(
  episodeId: string,
  parts: { PartNumber: number; ETag: string }[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  const found = await uploadingEpisode(episodeId);
  if (!found || !found.episode.original_key || !found.episode.upload_id) return { ok: false, message: "We couldn't find that upload." };
  const { supabase, episode } = found;

  try {
    await completeMultipartUpload(episode.original_key!, episode.upload_id!, parts);
  } catch (e) {
    console.error("finishEpisodeUpload: complete", e);
    return { ok: false, message: "The upload didn't finish properly. Please try uploading again." };
  }

  await supabase.from("episodes").update({ upload_id: null, processing_stage: "queued", processing_error: null }).eq("id", episodeId);
  await queueProcessing(episodeId);
  revalidatePath(`/app/shows/${episode.show_id}`);
  return { ok: true };
}

async function queueProcessing(episodeId: string) {
  const supabase = await createClient();
  if (process.env.TRIGGER_SECRET_KEY?.startsWith("tr_dev_") && process.env.NODE_ENV === "production") {
    // A Development key sends jobs to a queue nothing processes on the live site.
    console.error("TRIGGER_SECRET_KEY is a Development key (tr_dev_…). Use the Production key (tr_prod_…).");
  }
  try {
    const handle = await tasks.trigger<typeof processEpisode>("process-episode", { episodeId }, { idempotencyKey: `process-${episodeId}-${Date.now()}` });
    await supabase.from("episodes").update({ processing_run_id: handle.id }).eq("id", episodeId);
  } catch (e) {
    console.error("queueProcessing", e);
    await supabase
      .from("episodes")
      .update({ processing_stage: "failed", processing_error: "Processing couldn't start. Try again in a moment." })
      .eq("id", episodeId);
  }
}

export async function cancelEpisodeUpload(episodeId: string): Promise<void> {
  const found = await uploadingEpisode(episodeId);
  if (!found) return;
  if (found.episode.original_key && found.episode.upload_id) await abortMultipartUpload(found.episode.original_key, found.episode.upload_id);
  if (found.episode.processing_stage === "uploading") await found.supabase.from("episodes").delete().eq("id", episodeId);
}

export async function retryProcessing(episodeId: string): Promise<void> {
  const found = await uploadingEpisode(episodeId);
  if (!found || !found.episode.original_key) return;
  const stage = found.episode.processing_stage;
  const stuck = isStuck(stage, found.episode.updated_at as string);
  if (stage !== "failed" && !stuck) return;
  await found.supabase.from("episodes").update({ processing_stage: "queued", processing_error: null }).eq("id", episodeId);
  await queueProcessing(episodeId);
  revalidatePath(`/app/shows/${found.episode.show_id}/episodes/${episodeId}`);
}

// ---------------------------------------------------------------------------
// Editing an episode
// ---------------------------------------------------------------------------

export type EpisodeFormState = { error?: string; fieldErrors?: Record<string, string>; saved?: boolean };

const chapterSchema = z.array(z.object({ start: z.number().int().min(0), title: z.string().trim().min(1).max(120) })).max(100);

export async function saveEpisode(episodeId: string, _prev: EpisodeFormState, form: FormData): Promise<EpisodeFormState> {
  const workspace = await requireWorkspace("editor");
  const parsed = z
    .object({
      title: z.string().trim().min(1, "Give the episode a title.").max(300, "Use 300 characters or fewer."),
      description: z.string().trim().max(20000, "Show notes can be up to 20,000 characters.").default(""),
      episode_type: z.enum(["full", "trailer", "bonus"]),
      season_number: z.union([z.literal(""), z.coerce.number().int().min(1).max(9999)]),
      episode_number: z.union([z.literal(""), z.coerce.number().int().min(1).max(99999)]),
      explicit: z.enum(["yes", "no"]),
      chapters: z.string().default("[]"),
    })
    .safeParse({
      title: form.get("title"),
      description: form.get("description") ?? "",
      episode_type: form.get("episode_type"),
      season_number: form.get("season_number") ?? "",
      episode_number: form.get("episode_number") ?? "",
      explicit: form.get("explicit"),
      chapters: form.get("chapters") ?? "[]",
    });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] ??= i.message;
    return { fieldErrors: fe };
  }
  let chapters: z.infer<typeof chapterSchema>;
  try {
    chapters = chapterSchema.parse(JSON.parse(parsed.data.chapters));
  } catch {
    return { fieldErrors: { chapters: "Each chapter needs a start time and a title." } };
  }
  chapters.sort((a, b) => a.start - b.start);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("episodes")
    .update({
      title: parsed.data.title,
      title_auto: false,
      description: parsed.data.description || null,
      episode_type: parsed.data.episode_type,
      season_number: parsed.data.season_number === "" ? null : parsed.data.season_number,
      episode_number: parsed.data.episode_number === "" ? null : parsed.data.episode_number,
      explicit: parsed.data.explicit === "yes",
      chapters,
    })
    .eq("id", episodeId)
    .select("show_id, shows!inner(workspace_id)")
    .eq("shows.workspace_id", workspace.id)
    .maybeSingle();
  if (error || !data) return { error: "We couldn't save the episode. Please try again." };
  revalidatePath(`/app/shows/${data.show_id}`, "layout");
  return { saved: true };
}

export async function deleteEpisode(episodeId: string): Promise<void> {
  const found = await uploadingEpisode(episodeId);
  if (!found) redirect("/app/shows");
  if (found.episode.original_key && found.episode.upload_id) await abortMultipartUpload(found.episode.original_key, found.episode.upload_id);
  await found.supabase.from("episodes").delete().eq("id", episodeId);
  if (r2Config()) await deleteObjects([found.episode.original_key, found.episode.audio_key]);
  revalidatePath(`/app/shows/${found.episode.show_id}`);
  redirect(`/app/shows/${found.episode.show_id}?episodeDeleted=1`);
}
