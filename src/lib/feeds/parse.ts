import { XMLParser } from "fast-xml-parser";

export class FeedParseError extends Error {}

export type ParsedEpisode = {
  guid: string;
  title: string;
  description: string | null;
  publishedAt: string | null;
  mediaUrl: string;
  mediaBytes: number | null;
  mediaType: string | null;
  durationSeconds: number | null;
  season: number | null;
  episode: number | null;
  episodeType: "full" | "trailer" | "bonus";
  explicit: boolean | null;
  artworkUrl: string | null;
  link: string | null;
};

export type ParsedShow = {
  title: string;
  description: string | null;
  author: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  language: string;
  category: string | null;
  subcategory: string | null;
  explicit: boolean;
  artworkUrl: string | null;
  link: string | null;
  copyright: string | null;
  showType: "episodic" | "serial";
  format: "audio" | "video";
  /** Value of <itunes:new-feed-url>, if the feed says it has moved. */
  newFeedUrl: string | null;
  episodes: ParsedEpisode[];
  /** Items skipped because they had no audio or video file. */
  skipped: number;
};

type Node = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  isArray: (name) => name === "item" || name === "itunes:category" || name === "category" || name === "enclosure",
});

/** Text content of a node that may be a string, a number, or { "#text": ... }. */
function text(v: unknown): string | null {
  if (v == null) return null;
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") return text((v as Node)["#text"]);
  return null;
}

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Decodes leftover HTML entities in plain-text fields (some hosts double-encode titles: "You&#39;ll"). */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
    }
    return NAMED[code.toLowerCase()] ?? m;
  });
}

/** Plain-text field (title, author…): text with entities decoded. */
function plain(v: unknown): string | null {
  const t = text(v);
  return t ? decodeEntities(t).trim() || null : null;
}

function attr(v: unknown, name: string): string | null {
  if (!v || typeof v !== "object") return null;
  const node = Array.isArray(v) ? v[0] : v;
  return text((node as Node)?.[`@_${name}`]);
}

function bool(v: unknown): boolean | null {
  const t = text(v)?.toLowerCase();
  if (!t) return null;
  if (["yes", "true", "explicit"].includes(t)) return true;
  if (["no", "false", "clean"].includes(t)) return false;
  return null;
}

function int(v: unknown): number | null {
  const n = Number.parseInt(text(v) ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "1:02:03", "62:03", "3723" or "3723.5" → seconds. */
export function parseDuration(v: unknown): number | null {
  const t = text(v);
  if (!t) return null;
  if (/^\d+(\.\d+)?$/.test(t)) return Math.round(Number(t));
  const parts = t.split(":").map(Number);
  if (parts.some((p) => !Number.isFinite(p)) || parts.length > 3) return null;
  return parts.reduce((total, p) => total * 60 + p, 0);
}

function isoDate(v: unknown): string | null {
  const t = text(v);
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function httpUrl(v: string | null): string | null {
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function parseFeed(xml: string): ParsedShow {
  let doc: Node;
  try {
    doc = parser.parse(xml) as Node;
  } catch {
    throw new FeedParseError("That link isn't a podcast feed we can read.");
  }
  const channel = ((doc.rss as Node)?.channel ?? null) as Node | null;
  if (!channel || typeof channel !== "object") {
    throw new FeedParseError("That link isn't a podcast RSS feed. Paste the RSS link from your current host.");
  }

  const title = plain(channel.title);
  if (!title) throw new FeedParseError("That feed has no show title, so we can't import it.");

  const categories = (channel["itunes:category"] as Node[] | undefined) ?? [];
  const firstCategory = categories[0];
  const nested = firstCategory?.["itunes:category"] as Node[] | undefined;

  const owner = channel["itunes:owner"] as Node | undefined;
  const items = (channel.item as Node[] | undefined) ?? [];

  const episodes: ParsedEpisode[] = [];
  let skipped = 0;
  const seenGuids = new Set<string>();

  for (const item of items) {
    const enclosure = (item.enclosure as Node[] | undefined)?.[0];
    const mediaUrl = httpUrl(attr(enclosure, "url"));
    if (!mediaUrl) {
      skipped++;
      continue;
    }
    // Keep the original guid exactly: podcast apps use it to recognise episodes they've already shown.
    let guid = text(item.guid) ?? mediaUrl;
    if (seenGuids.has(guid)) guid = `${guid}#${seenGuids.size}`;
    seenGuids.add(guid);

    const type = text(item["itunes:episodeType"])?.toLowerCase();
    const bytes = Number.parseInt(attr(enclosure, "length") ?? "", 10);

    episodes.push({
      guid,
      title: (plain(item.title) ?? plain(item["itunes:title"]) ?? "Untitled episode").slice(0, 300),
      description: text(item["content:encoded"]) ?? text(item.description) ?? text(item["itunes:summary"]),
      publishedAt: isoDate(item.pubDate),
      mediaUrl,
      mediaBytes: Number.isFinite(bytes) && bytes > 0 ? bytes : null,
      mediaType: attr(enclosure, "type"),
      durationSeconds: parseDuration(item["itunes:duration"]),
      season: int(item["itunes:season"]),
      episode: int(item["itunes:episode"]),
      episodeType: type === "trailer" || type === "bonus" ? type : "full",
      explicit: bool(item["itunes:explicit"]),
      artworkUrl: httpUrl(attr(item["itunes:image"], "href")),
      link: httpUrl(text(item.link)),
    });
  }

  const videoCount = episodes.filter((e) => e.mediaType?.startsWith("video/")).length;
  const language = (text(channel.language) ?? "en").toLowerCase().slice(0, 10);

  return {
    title: title.slice(0, 200),
    description: text(channel.description) ?? text(channel["itunes:summary"]),
    author: plain(channel["itunes:author"]),
    ownerName: plain(owner?.["itunes:name"]),
    ownerEmail: text(owner?.["itunes:email"]),
    language,
    category: attr(firstCategory, "text"),
    subcategory: attr(nested?.[0], "text"),
    explicit: bool(channel["itunes:explicit"]) ?? false,
    artworkUrl: httpUrl(attr(channel["itunes:image"], "href") ?? text((channel.image as Node | undefined)?.url)),
    link: httpUrl(text(channel.link)),
    copyright: plain(channel.copyright),
    showType: text(channel["itunes:type"])?.toLowerCase() === "serial" ? "serial" : "episodic",
    format: episodes.length > 0 && videoCount > episodes.length / 2 ? "video" : "audio",
    newFeedUrl: httpUrl(text(channel["itunes:new-feed-url"])),
    episodes,
    skipped,
  };
}

/** Plain-text excerpt of show notes (they're often HTML). */
export function plainText(html: string | null, max = 240): string {
  if (!html) return "";
  const t = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t;
}
