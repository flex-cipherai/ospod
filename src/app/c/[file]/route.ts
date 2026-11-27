import type { NextRequest } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon";
import { chaptersJson } from "@/lib/feeds/rss";

/** Podcasting 2.0 chapters for an episode. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/c/[file]">) {
  const id = (await ctx.params).file.replace(/\.json$/i, "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const { data } = await createAnonClient().rpc("public_episode_extras", { p_episode: id });
  const chapters = (data as { chapters?: { start: number; title: string }[] } | null)?.chapters;
  if (!chapters?.length) return new Response("Not found", { status: 404 });
  return new Response(chaptersJson(chapters), {
    headers: { "Content-Type": "application/json+chapters; charset=utf-8", "Cache-Control": "public, max-age=600, s-maxage=600" },
  });
}
