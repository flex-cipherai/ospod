import { siteUrl } from "@/lib/env";

/**
 * Where public feeds and media are served. Set FEEDS_BASE_URL=https://feeds.ospod.io once
 * that domain points at the site; until then feeds use the site's own address.
 * Feed addresses are permanent once submitted to Apple and Spotify, so don't submit
 * a feed while it's on the temporary address.
 */
export function feedsBase(): string {
  return (process.env.FEEDS_BASE_URL || siteUrl()).replace(/\/+$/, "");
}

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
