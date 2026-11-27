/**
 * Builds a podcast RSS feed that Apple Podcasts, Spotify, YouTube Music, Amazon and every
 * other app accept, with Podcasting 2.0 extras (guid, chapters, transcripts).
 */
import { createHash } from "node:crypto";
import { showNotesHtml, plainFromNotes } from "./markdown";
import { chaptersUrl, feedUrl, mediaUrl, transcriptUrl } from "./urls";

export type FeedShow = {
  id: string;
  title: string;
  description: string | null;
  author: string | null;
  owner_email: string | null;
  language: string;
  category: string | null;
  subcategory: string | null;
  explicit: boolean;
  artwork_url: string | null;
  website_url: string | null;
  copyright: string | null;
  show_type: "episodic" | "serial";
  feed_slug: string;
  updated_at: string;
};

export type FeedEpisode = {
  id: string;
  guid: string;
  title: string;
  description: string | null;
  published_at: string;
  episode_type: "full" | "trailer" | "bonus";
  season_number: number | null;
  episode_number: number | null;
  explicit: boolean | null;
  duration_seconds: number | null;
  artwork_url: string | null;
  link: string | null;
  audio_bytes: number | null;
  has_chapters: boolean;
  has_transcript: boolean;
};

const xml = (s: string | null | undefined) =>
  (s ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;

/** Podcasting 2.0 podcast:guid: UUIDv5 of the feed URL without its scheme. */
export function podcastGuid(url: string): string {
  const ns = Buffer.from("ead4c236bf5858c6a2c6a0b28263e7d4", "hex");
  const name = url.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const hash = createHash("sha1").update(Buffer.concat([ns, Buffer.from(name, "utf8")])).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const h = hash.subarray(0, 16).toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

function item(show: FeedShow, e: FeedEpisode): string {
  const notes = showNotesHtml(e.description);
  const lines = [
    `<item>`,
    `<title>${xml(e.title)}</title>`,
    `<guid isPermaLink="false">${xml(e.guid)}</guid>`,
    `<pubDate>${new Date(e.published_at).toUTCString()}</pubDate>`,
    `<description>${cdata(notes)}</description>`,
    `<content:encoded>${cdata(notes)}</content:encoded>`,
    `<enclosure url="${xml(mediaUrl(e.id))}" length="${e.audio_bytes ?? 0}" type="audio/mpeg"/>`,
    e.link && `<link>${xml(e.link)}</link>`,
    e.duration_seconds ? `<itunes:duration>${Math.round(e.duration_seconds)}</itunes:duration>` : null,
    `<itunes:episodeType>${e.episode_type}</itunes:episodeType>`,
    e.season_number ? `<itunes:season>${e.season_number}</itunes:season>` : null,
    e.episode_number ? `<itunes:episode>${e.episode_number}</itunes:episode>` : null,
    `<itunes:explicit>${(e.explicit ?? show.explicit) ? "true" : "false"}</itunes:explicit>`,
    e.artwork_url && `<itunes:image href="${xml(e.artwork_url)}"/>`,
    e.has_chapters && `<podcast:chapters url="${xml(chaptersUrl(e.id))}" type="application/json+chapters"/>`,
    e.has_transcript && `<podcast:transcript url="${xml(transcriptUrl(e.id))}" type="text/vtt"/>`,
    `</item>`,
  ];
  return lines.filter(Boolean).join("\n");
}

export function buildRss(show: FeedShow, episodes: FeedEpisode[]): string {
  const self = feedUrl(show.feed_slug);
  const description = showNotesHtml(show.description) || xml(show.title);
  const lastBuild = [show.updated_at, ...episodes.map((e) => e.published_at)].sort().pop()!;

  const channel = [
    `<atom:link href="${xml(self)}" rel="self" type="application/rss+xml"/>`,
    `<title>${xml(show.title)}</title>`,
    `<link>${xml(show.website_url || self)}</link>`,
    `<language>${xml(show.language)}</language>`,
    `<description>${cdata(description)}</description>`,
    `<itunes:summary>${xml(plainFromNotes(show.description).slice(0, 4000))}</itunes:summary>`,
    show.copyright && `<copyright>${xml(show.copyright)}</copyright>`,
    `<generator>Ospod (ospod.io)</generator>`,
    `<lastBuildDate>${new Date(lastBuild).toUTCString()}</lastBuildDate>`,
    `<itunes:author>${xml(show.author || show.title)}</itunes:author>`,
    `<itunes:owner><itunes:name>${xml(show.author || show.title)}</itunes:name>${
      show.owner_email ? `<itunes:email>${xml(show.owner_email)}</itunes:email>` : ""
    }</itunes:owner>`,
    show.artwork_url && `<itunes:image href="${xml(show.artwork_url)}"/>`,
    show.artwork_url && `<image><url>${xml(show.artwork_url)}</url><title>${xml(show.title)}</title><link>${xml(show.website_url || self)}</link></image>`,
    show.category &&
      (show.subcategory
        ? `<itunes:category text="${xml(show.category)}"><itunes:category text="${xml(show.subcategory)}"/></itunes:category>`
        : `<itunes:category text="${xml(show.category)}"/>`),
    `<itunes:explicit>${show.explicit ? "true" : "false"}</itunes:explicit>`,
    `<itunes:type>${show.show_type}</itunes:type>`,
    `<podcast:guid>${podcastGuid(self)}</podcast:guid>`,
    show.owner_email && `<podcast:locked owner="${xml(show.owner_email)}">yes</podcast:locked>`,
    ...episodes.map((e) => item(show, e)),
  ];

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:podcast="https://podcastindex.org/namespace/1.0">`,
    `<channel>`,
    channel.filter(Boolean).join("\n"),
    `</channel>`,
    `</rss>`,
  ].join("\n");
}

/** Chapters in the Podcasting 2.0 JSON chapters format. */
export const chaptersJson = (chapters: { start: number; title: string }[]) =>
  JSON.stringify({ version: "1.2.0", chapters: chapters.map((c) => ({ startTime: c.start, title: c.title })) });

/** Transcript as WebVTT, with speaker names. */
export function transcriptVtt(segments: { start: number; end: number; speaker: number; text: string }[]): string {
  const ts = (s: number) => {
    const ms = Math.round(s * 1000);
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const sec = Math.floor((ms % 60_000) / 1000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
  };
  return (
    "WEBVTT\n\n" +
    segments
      .map((s) => `${ts(s.start)} --> ${ts(Math.max(s.end, s.start + 0.5))}\n<v Speaker ${s.speaker + 1}>${s.text.replace(/-->/g, "->")}`)
      .join("\n\n") +
    "\n"
  );
}
