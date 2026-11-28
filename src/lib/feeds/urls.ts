import { siteUrl } from "@/lib/env";

/**
 * Where public feeds and media are served: feeds.ospod.io on the live site (override with FEEDS_BASE_URL),
 * the local address in development.
 * Feed addresses are permanent once submitted to Apple and Spotify, so don't submit
 * a feed while it's on the temporary address.
 */
export function feedsBase(): string {
  const configured = process.env.FEEDS_BASE_URL || (process.env.NODE_ENV === "production" ? PERMANENT_FEEDS_URL : siteUrl());
  return configured.replace(/\/+$/, "");
}

/** Live since 2026-11-28 (CNAME at GoDaddy → ospod.netlify.app, alias on the Netlify site). */
const PERMANENT_FEEDS_URL = "https://feeds.ospod.io";

/** True when feeds are on their permanent address (a dedicated feeds domain). */
export function feedsOnPermanentDomain(): boolean {
  try {
    return new URL(feedsBase()).hostname.startsWith("feeds.");
  } catch {
    return false;
  }
}

/** On the feeds domain, feeds sit at the root (feeds.ospod.io/my-show); elsewhere under /feed/. */
export const feedUrl = (slug: string) => (feedsOnPermanentDomain() ? `${feedsBase()}/${slug}` : `${feedsBase()}/feed/${slug}`);
export const mediaUrl = (episodeId: string) => `${feedsBase()}/e/${episodeId}.mp3`;
export const chaptersUrl = (episodeId: string) => `${feedsBase()}/c/${episodeId}.json`;
export const transcriptUrl = (episodeId: string) => `${feedsBase()}/t/${episodeId}.vtt`;
