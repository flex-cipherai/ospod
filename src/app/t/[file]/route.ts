import type { NextRequest } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon";
import { transcriptVtt } from "@/lib/feeds/rss";

/** An episode's transcript as WebVTT (shown by Apple Podcasts and other apps). */
export async function GET(_req: NextRequest, ctx: RouteContext<"/t/[file]">) {
  const id = (await ctx.params).file.replace(/\.vtt$/i, "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const { data } = await createAnonClient().rpc("public_episode_extras", { p_episode: id });
  const segments = (data as { segments?: { start: number; end: number; speaker: number; text: string }[] | null } | null)?.segments;
  if (!segments?.length) return new Response("Not found", { status: 404 });
  return new Response(transcriptVtt(segments), {
    headers: { "Content-Type": "text/vtt; charset=utf-8", "Cache-Control": "public, max-age=600, s-maxage=600" },
  });
}
