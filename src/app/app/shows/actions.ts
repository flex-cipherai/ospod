"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/auth";
import { fetchPublicText, FeedFetchError } from "@/lib/feeds/safe-fetch";
import { parseFeed, FeedParseError, type ParsedShow } from "@/lib/feeds/parse";
import { feedFromApplePodcastsUrl, searchPodcasts, type DirectoryResult } from "@/lib/feeds/search";
import { CATEGORIES, FEED_SLUG_PATTERN, LANGUAGES, slugify } from "@/lib/podcast-meta";

type SupabaseError = { code?: string; message: string; hint?: string | null } | null;

/** Turns database errors into sentences a podcaster understands. */
function friendly(error: SupabaseError, fallback: string): string {
  if (!error) return fallback;
  if (error.hint === "show_limit" || error.hint === "plan_canceled") return error.message;
  if (error.code === "23505" && error.message.includes("shows_workspace_import_feed")) {
    return "You've already imported this show into this workspace.";
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Finding a show to import
// ---------------------------------------------------------------------------

export type FindResult =
  | { kind: "results"; results: DirectoryResult[] }
  | { kind: "feed"; feedUrl: string }
  | { kind: "error"; message: string };

/** Search by name, or resolve a pasted link (RSS feed or Apple Podcasts page). */
export async function findShow(query: string): Promise<FindResult> {
  await requireWorkspace("editor");
  const q = query.trim().slice(0, 500);
  if (!q) return { kind: "error", message: "Type your show's name or paste its RSS link." };

  if (/^https?:\/\//i.test(q) || /^[\w-]+\.[\w.-]+\//.test(q)) {
    const url = /^https?:\/\//i.test(q) ? q : `https://${q}`;
    let host = "";
    try {
      host = new URL(url).hostname;
    } catch {
      return { kind: "error", message: "That doesn't look like a web address." };
    }
    if (host.endsWith("podcasts.apple.com") || host.endsWith("itunes.apple.com")) {
      const hit = await feedFromApplePodcastsUrl(url).catch(() => null);
      return hit
        ? { kind: "feed", feedUrl: hit.feedUrl }
        : { kind: "error", message: "We couldn't find that show on Apple Podcasts. Try pasting its RSS link instead." };
    }
    if (host.endsWith("spotify.com") || host.endsWith("youtube.com") || host === "youtu.be") {
      return {
        kind: "error",
        message: "Spotify and YouTube links don't include your feed. Search for your show by name, or paste the RSS link from your host.",
      };
    }
    return { kind: "feed", feedUrl: url };
  }

  try {
    const results = await searchPodcasts(q);
    return results.length
      ? { kind: "results", results }
      : { kind: "error", message: "No shows found with that name. Try a different spelling, or paste your RSS link." };
  } catch {
    return { kind: "error", message: "Search isn't responding right now. Paste your RSS link instead." };
  }
}

// ---------------------------------------------------------------------------
// Previewing and importing a feed
// ---------------------------------------------------------------------------

export type FeedPreview = {
  feedUrl: string;
  title: string;
  author: string | null;
  artworkUrl: string | null;
  format: "audio" | "video";
  episodeCount: number;
  skipped: number;
  movedTo: string | null;
  latest: { title: string; publishedAt: string | null }[];
  oldest: string | null;
};

async function loadFeed(feedUrl: string): Promise<{ show: ParsedShow; finalUrl: string }> {
  const { text, finalUrl } = await fetchPublicText(feedUrl);
  return { show: parseFeed(text), finalUrl };
}

export async function previewFeed(feedUrl: string): Promise<{ ok: true; preview: FeedPreview } | { ok: false; message: string }> {
  await requireWorkspace("editor");
  try {
    const { show, finalUrl } = await loadFeed(feedUrl);
    if (show.episodes.length === 0) {
      return { ok: false, message: "That feed has no episodes with audio or video yet. You can start a new show instead." };
    }
    const dates = show.episodes.map((e) => e.publishedAt).filter((d): d is string => !!d).sort();
    return {
      ok: true,
      preview: {
        feedUrl: finalUrl,
        title: show.title,
        author: show.author ?? show.ownerName,
        artworkUrl: show.artworkUrl,
        format: show.format,
        episodeCount: show.episodes.length,
        skipped: show.skipped,
        movedTo: show.newFeedUrl && show.newFeedUrl !== finalUrl ? show.newFeedUrl : null,
        latest: [...show.episodes]
          .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
          .slice(0, 3)
          .map((e) => ({ title: e.title, publishedAt: e.publishedAt })),
        oldest: dates[0] ?? null,
      },
    };
  } catch (e) {
    if (e instanceof FeedFetchError || e instanceof FeedParseError) return { ok: false, message: e.message };
    console.error("previewFeed", e);
    return { ok: false, message: "Something went wrong reading that feed. Please try again." };
  }
}

const EPISODE_BATCH = 200;

/** Creates a show with a unique feed address, retrying with a suffix if the address is taken. */
async function insertShow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: Record<string, unknown> & { title: string },
  preferredSlug?: string,
): Promise<{ id: string } | { error: string }> {
  const base = preferredSlug && FEED_SLUG_PATTERN.test(preferredSlug) ? preferredSlug : slugify(row.title);
  for (let attempt = 0; attempt < 6; attempt++) {
    const feed_slug = attempt === 0 ? base : `${base.slice(0, 52)}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase.from("shows").insert({ ...row, feed_slug }).select("id").single();
    if (!error) return { id: data.id as string };
    // Another show already has this feed address: try another.
    if (error.code === "23505" && error.message.includes("feed_slug")) continue;
    return { error: friendly(error, "We couldn't create the show. Please try again.") };
  }
  return { error: "We couldn't find a free feed address. Please try again." };
}

export async function importFeed(feedUrl: string): Promise<{ ok: false; message: string }> {
  const workspace = await requireWorkspace("editor");
  let show: ParsedShow;
  let finalUrl: string;
  try {
    ({ show, finalUrl } = await loadFeed(feedUrl));
  } catch (e) {
    if (e instanceof FeedFetchError || e instanceof FeedParseError) return { ok: false, message: e.message };
    console.error("importFeed: load", e);
    return { ok: false, message: "Something went wrong reading that feed. Please try again." };
  }
  if (show.episodes.length === 0) return { ok: false, message: "That feed has no episodes to import." };

  const supabase = await createClient();
  const created = await insertShow(supabase, {
    workspace_id: workspace.id,
    title: show.title,
    description: show.description,
    author: show.author ?? show.ownerName,
    owner_email: show.ownerEmail,
    language: show.language,
    category: show.category,
    subcategory: show.subcategory,
    explicit: show.explicit,
    artwork_url: show.artworkUrl,
    format: show.format,
    website_url: show.link,
    copyright: show.copyright,
    show_type: show.showType,
    imported_from_feed: finalUrl,
    imported_at: new Date().toISOString(),
    status: "draft",
  });
  if ("error" in created) return { ok: false, message: created.error };

  const rows = show.episodes.map((e) => {
    const isVideo = e.mediaType?.startsWith("video/") ?? false;
    return {
      show_id: created.id,
      guid: e.guid,
      title: e.title,
      description: e.description,
      episode_type: e.episodeType,
      season_number: e.season,
      episode_number: e.episode,
      explicit: e.explicit,
      status: "published",
      published_at: e.publishedAt ?? new Date().toISOString(),
      audio_url: isVideo ? null : e.mediaUrl,
      audio_bytes: e.mediaBytes,
      audio_mime: e.mediaType,
      video_url: isVideo ? e.mediaUrl : null,
      duration_seconds: e.durationSeconds,
      artwork_url: e.artworkUrl,
      link: e.link,
      source_media_url: e.mediaUrl,
      imported: true,
    };
  });

  for (let i = 0; i < rows.length; i += EPISODE_BATCH) {
    const { error } = await supabase.from("episodes").insert(rows.slice(i, i + EPISODE_BATCH));
    if (error) {
      console.error("importFeed: episodes", error);
      // Don't leave a half-imported show behind.
      await supabase.from("shows").delete().eq("id", created.id);
      return { ok: false, message: "We couldn't import every episode, so nothing was saved. Please try again." };
    }
  }

  revalidatePath("/app", "layout");
  redirect(`/app/shows/${created.id}?imported=${rows.length}`);
}

// ---------------------------------------------------------------------------
// Creating and editing shows
// ---------------------------------------------------------------------------

export type ShowFormState = { error?: string; fieldErrors?: Record<string, string>; saved?: boolean };

const showSchema = z
  .object({
    title: z.string().trim().min(1, "Give your show a name.").max(200, "Use 200 characters or fewer."),
    description: z.string().trim().max(4000, "Use 4,000 characters or fewer.").optional().default(""),
    author: z.string().trim().max(200).optional().default(""),
    owner_email: z.union([z.literal(""), z.string().trim().toLowerCase().email("Enter a valid email address.")]).default(""),
    language: z.string().refine((v) => LANGUAGES.some((l) => l.code === v), "Choose a language."),
    category: z.string().refine((v) => v in CATEGORIES, "Choose a category."),
    subcategory: z.string().optional().default(""),
    explicit: z.enum(["yes", "no"]).default("no"),
    format: z.enum(["audio", "video"]).default("audio"),
    show_type: z.enum(["episodic", "serial"]).default("episodic"),
    website_url: z.union([z.literal(""), z.string().trim().url("Enter a full web address, starting with https://")]).default(""),
    feed_slug: z
      .string()
      .trim()
      .toLowerCase()
      .optional()
      .default("")
      .refine((v) => v === "" || FEED_SLUG_PATTERN.test(v), "Use 3–60 lowercase letters, numbers and dashes."),
  })
  .refine((v) => !v.subcategory || (CATEGORIES[v.category] ?? []).includes(v.subcategory), {
    message: "Choose a subcategory from the list.",
    path: ["subcategory"],
  });

function readShowForm(form: FormData) {
  const get = (k: string) => (form.get(k) as string | null) ?? undefined;
  return showSchema.safeParse({
    title: get("title"),
    description: get("description"),
    author: get("author"),
    owner_email: get("owner_email") ?? "",
    language: get("language"),
    category: get("category"),
    subcategory: get("subcategory"),
    explicit: get("explicit"),
    format: get("format"),
    show_type: get("show_type"),
    website_url: get("website_url") ?? "",
    feed_slug: get("feed_slug"),
  });
}

function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of error.issues) out[String(i.path[0])] ??= i.message;
  return out;
}

const nullIfEmpty = (v: string) => (v === "" ? null : v);

export async function createShow(_prev: ShowFormState, form: FormData): Promise<ShowFormState> {
  const workspace = await requireWorkspace("editor");
  const parsed = readShowForm(form);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;

  const supabase = await createClient();
  const created = await insertShow(
    supabase,
    {
      workspace_id: workspace.id,
      title: v.title,
      description: nullIfEmpty(v.description),
      author: nullIfEmpty(v.author),
      owner_email: nullIfEmpty(v.owner_email),
      language: v.language,
      category: v.category,
      subcategory: nullIfEmpty(v.subcategory),
      explicit: v.explicit === "yes",
      format: v.format,
      show_type: v.show_type,
      website_url: nullIfEmpty(v.website_url),
      status: "draft",
    },
    v.feed_slug || undefined,
  );
  if ("error" in created) return { error: created.error };

  revalidatePath("/app", "layout");
  redirect(`/app/shows/${created.id}?created=1`);
}

export async function updateShow(showId: string, _prev: ShowFormState, form: FormData): Promise<ShowFormState> {
  await requireWorkspace("editor");
  const parsed = readShowForm(form);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;

  const supabase = await createClient();
  const update: Record<string, unknown> = {
    title: v.title,
    description: nullIfEmpty(v.description),
    author: nullIfEmpty(v.author),
    owner_email: nullIfEmpty(v.owner_email),
    language: v.language,
    category: v.category,
    subcategory: nullIfEmpty(v.subcategory),
    explicit: v.explicit === "yes",
    format: v.format,
    show_type: v.show_type,
    website_url: nullIfEmpty(v.website_url),
  };
  // The feed address is permanent once the show is live on Ospod.
  const { data: current } = await supabase.from("shows").select("status").eq("id", showId).maybeSingle();
  if (!current) return { error: "We couldn't find that show." };
  if (v.feed_slug && current.status === "draft") update.feed_slug = v.feed_slug;

  const { error } = await supabase.from("shows").update(update).eq("id", showId);
  if (error) {
    if (error.code === "23505" && error.message.includes("feed_slug")) {
      return { fieldErrors: { feed_slug: "Another show already uses this address. Try a different one." } };
    }
    return { error: "We couldn't save your changes. Please try again." };
  }
  revalidatePath(`/app/shows/${showId}`, "layout");
  return { saved: true };
}

/** Saves cover art that the browser uploaded to storage. */
export async function setShowArtwork(showId: string, path: string): Promise<{ ok: boolean; message?: string }> {
  const workspace = await requireWorkspace("editor");
  if (!path.startsWith(`${workspace.id}/${showId}/`) || path.includes("..")) {
    return { ok: false, message: "That upload doesn't belong to this show." };
  }
  const supabase = await createClient();
  const { data } = supabase.storage.from("show-artwork").getPublicUrl(path);
  const { error } = await supabase.from("shows").update({ artwork_url: data.publicUrl }).eq("id", showId).eq("workspace_id", workspace.id);
  if (error) return { ok: false, message: "We couldn't save the cover art. Please try again." };
  revalidatePath(`/app/shows/${showId}`, "layout");
  revalidatePath("/app/shows");
  return { ok: true };
}

export async function deleteShow(showId: string, form: FormData): Promise<void> {
  await requireWorkspace("admin");
  const supabase = await createClient();
  const { data: show } = await supabase.from("shows").select("title").eq("id", showId).maybeSingle();
  if (!show) redirect("/app/shows");
  if ((form.get("confirm") as string | null)?.trim() !== show.title) {
    redirect(`/app/shows/${showId}/settings?delete=mismatch`);
  }
  await supabase.from("shows").delete().eq("id", showId);
  revalidatePath("/app", "layout");
  redirect("/app/shows?deleted=1");
}
