/**
 * Turns an uploaded episode into something ready to publish:
 *   1. Prepare audio  - extract and loudness-match the audio (-16 LUFS, the podcast standard) as a 128 kbps MP3
 *   2. Transcribe     - Deepgram, with speakers
 *   3. Write          - Claude drafts titles, show notes, chapters and clip ideas
 * Runs on Trigger.dev (long-running, with FFmpeg), not on Netlify.
 */
import { spawn } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { logger, task } from "@trigger.dev/sdk";
import { createServiceClient } from "@/lib/supabase/service";
import { getObjectStream, mediaKeys, putObject, signedDownloadUrl } from "@/lib/media/r2";
import { transcribeUrl, transcriptForPrompt } from "@/lib/media/transcribe";
import { draftEpisodeCopy } from "@/lib/ai/episode-writer";

type Stage = "preparing" | "transcribing" | "writing" | "ready" | "failed";

/** Shown to the podcaster when processing fails. Technical detail goes to the logs. */
class FriendlyError extends Error {}

function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err = (err + d).slice(-4000)));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} exited ${code}: ${err}`))));
  });
}

const FFMPEG = () => process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE = () => process.env.FFPROBE_PATH || "ffprobe";

async function probe(file: string): Promise<{ duration: number; hasAudio: boolean }> {
  const json = JSON.parse(await run(FFPROBE(), ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file])) as {
    format?: { duration?: string };
    streams?: { codec_type?: string }[];
  };
  return {
    duration: Math.round(Number(json.format?.duration ?? 0)),
    hasAudio: (json.streams ?? []).some((s) => s.codec_type === "audio"),
  };
}

export const processEpisode = task({
  id: "process-episode",
  machine: "medium-1x",
  maxDuration: 60 * 60,
  retry: { maxAttempts: 2, minTimeoutInMs: 10_000 },
  run: async ({ episodeId }: { episodeId: string }) => {
    const db = createServiceClient();
    const startedAt = Date.now();

    const setStage = async (stage: Stage, extra: Record<string, unknown> = {}) => {
      const { error } = await db.from("episodes").update({ processing_stage: stage, ...extra }).eq("id", episodeId);
      if (error) logger.error("Couldn't update stage", { stage, error });
    };

    const { data: episode, error } = await db
      .from("episodes")
      .select(
        "id, show_id, title, title_auto, description, chapters, original_key, original_bytes, media_kind, shows!inner(id, workspace_id, title, description, category, language, author)",
      )
      .eq("id", episodeId)
      .single();
    if (error || !episode) throw new Error(`Episode ${episodeId} not found`);
    if (!episode.original_key) throw new FriendlyError("The uploaded file is missing. Please upload it again.");

    const show = episode.shows as unknown as {
      id: string;
      workspace_id: string;
      title: string;
      description: string | null;
      category: string | null;
      language: string | null;
      author: string | null;
    };
    const keys = mediaKeys(show.workspace_id, show.id, episode.id);
    const usage = (kind: string, quantity: number, detail?: string) =>
      db.from("usage_events").insert({ workspace_id: show.workspace_id, episode_id: episode.id, kind, quantity, detail });

    await setStage("preparing", { processing_started_at: new Date().toISOString(), processing_error: null });

    // 1. Prepare audio -------------------------------------------------------
    const dir = await mkdtemp(path.join(tmpdir(), "ospod-"));
    let duration = 0;
    try {
      const input = path.join(dir, `original${path.extname(episode.original_key)}`);
      const output = path.join(dir, "audio.mp3");
      await pipeline(await getObjectStream(episode.original_key), createWriteStream(input));

      const probed = await probe(input);
      if (!probed.hasAudio) throw new FriendlyError("We couldn't find any audio in that file. Check the export and upload it again.");

      await run(FFMPEG(), [
        "-y", "-hide_banner", "-loglevel", "error",
        "-i", input,
        "-map", "0:a:0", "-vn",
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
        "-ar", "44100", "-ac", "2",
        "-c:a", "libmp3lame", "-b:a", "128k",
        "-map_metadata", "-1", "-id3v2_version", "3",
        "-metadata", `title=${episode.title}`,
        "-metadata", `artist=${show.author ?? show.title}`,
        "-metadata", `album=${show.title}`,
        output,
      ]);

      duration = (await probe(output)).duration || probed.duration;
      const { size } = await stat(output);
      await putObject(keys.audio, createReadStream(output), "audio/mpeg", size);
      await db
        .from("episodes")
        .update({ audio_key: keys.audio, audio_bytes: size, audio_mime: "audio/mpeg", duration_seconds: duration })
        .eq("id", episode.id);
      logger.info("Audio ready", { duration, size });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }

    // 2. Transcribe ----------------------------------------------------------
    await setStage("transcribing");
    const transcript = await transcribeUrl(await signedDownloadUrl(keys.audio, 60 * 60 * 3));
    if (transcript.segments.length === 0) {
      throw new FriendlyError("We couldn't hear any speech in this episode, so there's nothing to transcribe.");
    }
    await db.from("episode_transcripts").upsert({
      episode_id: episode.id,
      language: transcript.language,
      text: transcript.text,
      segments: transcript.segments,
      speakers: transcript.speakers,
      provider: "deepgram",
    });
    await usage("transcription_seconds", duration, "deepgram nova-3");

    // 3. Write ---------------------------------------------------------------
    await setStage("writing");
    const { data: recent } = await db
      .from("episodes")
      .select("title")
      .eq("show_id", show.id)
      .neq("id", episode.id)
      .eq("title_auto", false)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(6);

    const { draft, model, inputTokens, outputTokens } = await draftEpisodeCopy(transcriptForPrompt(transcript.segments), {
      showTitle: show.title,
      showDescription: show.description,
      category: show.category,
      language: transcript.language ?? show.language,
      durationSeconds: duration,
      recentTitles: (recent ?? []).map((r) => r.title as string),
      hostNames: show.author,
    });
    await db.from("episode_ai_drafts").upsert({
      episode_id: episode.id,
      titles: draft.titles,
      summary: draft.summary,
      show_notes: draft.show_notes,
      chapters: draft.chapters,
      keywords: draft.keywords,
      clip_ideas: draft.clip_ideas,
      model,
    });
    await usage("ai_input_tokens", inputTokens, model);
    await usage("ai_output_tokens", outputTokens, model);

    // Fill in anything the podcaster hasn't written themselves.
    const fill: Record<string, unknown> = {};
    if (episode.title_auto && draft.titles[0]) fill.title = draft.titles[0].slice(0, 300);
    if (!episode.description) fill.description = draft.show_notes;
    if (!Array.isArray(episode.chapters) || episode.chapters.length === 0) fill.chapters = draft.chapters;

    await setStage("ready", { ...fill, processing_finished_at: new Date().toISOString() });
    await usage("upload_bytes", Number(episode.original_bytes ?? 0));
    await usage("processing_seconds", Math.round((Date.now() - startedAt) / 1000));
    return { duration, chapters: draft.chapters.length };
  },

  onFailure: async ({ payload, error }) => {
    const db = createServiceClient();
    const message =
      error instanceof FriendlyError ? error.message : "Something went wrong while processing this episode. Try again, and contact us if it keeps happening.";
    logger.error("Episode processing failed", { episodeId: payload.episodeId, error: String(error) });
    await db
      .from("episodes")
      .update({ processing_stage: "failed", processing_error: message, processing_finished_at: new Date().toISOString() })
      .eq("id", payload.episodeId);
  },
});
