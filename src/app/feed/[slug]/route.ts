import type { NextRequest } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon";
import { buildRss, type FeedEpisode, type FeedShow } from "@/lib/feeds/rss";

/** A show's public RSS feed: what Apple Podcasts, Spotify and every podcast app read. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/feed/[slug]">) {
  const { slug } = await ctx.params;
  const clean = slug.replace(/\.(xml|rss)$/i, "").toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(clean)) return new Response("Not found", { status: 404 });

  const { data, error } = await createAnonClient().rpc("public_feed", { p_slug: clean });
  if (error) {
    console.error("feed", clean, error);
    return new Response("Feed temporarily unavailable", { status: 503, headers: { "Retry-After": "60" } });
  }
  if (!data) return new Response("Not found", { status: 404 });

  const { show, episodes } = data as { show: FeedShow; episodes: FeedEpisode[] };
  return new Response(buildRss(show, episodes), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      // Apps poll feeds often: let the CDN serve them for a few minutes.
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
      "X-Robots-Tag": "noindex",
    },
  });
}
