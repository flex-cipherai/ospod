import type { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { createAnonClient } from "@/lib/supabase/anon";
import { r2Config, signedDownloadUrl } from "@/lib/media/r2";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function listenerFrom(req: NextRequest): string {
  const ip =
    req.headers.get("x-nf-client-connection-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  // A salted hash: we can count unique listeners without keeping anyone's IP address.
  return createHash("sha256").update(`${process.env.DOWNLOAD_HASH_SALT ?? "ospod-downloads"}:${ip}`).digest("hex").slice(0, 32);
}

function countryFrom(req: NextRequest): string | null {
  const geo = req.headers.get("x-nf-geo");
  if (geo) {
    try {
      return (JSON.parse(Buffer.from(geo, "base64").toString("utf8")) as { country?: { code?: string } }).country?.code ?? null;
    } catch {
      /* ignore */
    }
  }
  return req.headers.get("x-country") ?? null;
}

async function handle(req: NextRequest, ctx: RouteContext<"/e/[file]">, isHead: boolean) {
  const { file } = await ctx.params;
  const id = file.replace(/\.(mp3|m4a|mp4)$/i, "");
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });

  const range = /^bytes=(\d+)-/.exec(req.headers.get("range") ?? "");
  const { data, error } = await createAnonClient().rpc("record_download", {
    p_episode: id,
    p_listener: listenerFrom(req),
    p_user_agent: req.headers.get("user-agent") ?? "",
    p_country: countryFrom(req),
    // HEAD requests are apps checking the file, not downloads: marked -1 so they aren't counted.
    p_range_start: isHead ? -1 : range ? Number(range[1]) : 0,
  });
  if (error) {
    console.error("media", id, error);
    return new Response("Temporarily unavailable", { status: 503, headers: { "Retry-After": "30" } });
  }
  const row = (data as { audio_key: string | null; source_url: string | null }[] | null)?.[0];
  if (!row) return new Response("Not found", { status: 404 });

  const target = row.audio_key && r2Config() ? await signedDownloadUrl(row.audio_key, 60 * 60 * 12) : row.source_url;
  if (!target) return new Response("Not found", { status: 404 });
  return new Response(null, { status: 302, headers: { Location: target, "Cache-Control": "no-store" } });
}

export const GET = (req: NextRequest, ctx: RouteContext<"/e/[file]">) => handle(req, ctx, false);
export const HEAD = (req: NextRequest, ctx: RouteContext<"/e/[file]">) => handle(req, ctx, true);
