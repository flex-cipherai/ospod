import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class FeedFetchError extends Error {}

const USER_AGENT = "Ospod/1.0 (+https://ospod.io; podcast import)";
const MAX_REDIRECTS = 5;

/** True for addresses that point inside a private network (blocks SSRF: we fetch links people paste). */
function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
      (a === 169 && b === 254) || // link-local, cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224 // multicast and reserved
    );
  }
  if (v === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::" || lower === "::1") return true;
    if (lower.startsWith("::ffff:")) return isPrivateAddress(lower.slice(7));
    return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(lower);
  }
  return true;
}

async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FeedFetchError("That doesn't look like a web address.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new FeedFetchError("Feed links must start with https:// or http://.");
  }
  if (url.username || url.password) throw new FeedFetchError("Feed links can't contain a username or password.");
  if (url.port && !["80", "443", "8080", "8443"].includes(url.port)) {
    throw new FeedFetchError("That feed link uses an unusual port we can't fetch from.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new FeedFetchError("That address isn't on the public internet.");
  }
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (addresses.length === 0) throw new FeedFetchError("We couldn't find that website. Check the link and try again.");
  if (addresses.some((a) => isPrivateAddress(a.address))) {
    throw new FeedFetchError("That address isn't on the public internet.");
  }
  return url;
}

/**
 * Fetches a public URL as text, with a size cap, a timeout, and every redirect re-checked.
 * Used for RSS feeds that people paste in.
 */
export async function fetchPublicText(
  raw: string,
  { maxBytes = 25 * 1024 * 1024, timeoutMs = 20_000, accept = "application/rss+xml, application/xml, text/xml, */*" } = {},
): Promise<{ text: string; finalUrl: string }> {
  let url = await assertPublicUrl(raw);
  const signal = AbortSignal.timeout(timeoutMs);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let res: Response;
    try {
      res = await fetch(url, { redirect: "manual", signal, headers: { "user-agent": USER_AGENT, accept } });
    } catch (e) {
      if ((e as Error).name === "TimeoutError") throw new FeedFetchError("That feed took too long to respond. Try again in a moment.");
      throw new FeedFetchError("We couldn't reach that feed. Check the link and try again.");
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new FeedFetchError("That feed redirects somewhere we can't follow.");
      url = await assertPublicUrl(new URL(location, url).toString());
      continue;
    }
    if (res.status === 404 || res.status === 410) throw new FeedFetchError("There's no feed at that link (it may have moved or been deleted).");
    if (!res.ok) throw new FeedFetchError(`The feed's server answered with an error (${res.status}). Try again later.`);

    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > maxBytes) throw new FeedFetchError("That feed is too large to import.");

    const reader = res.body?.getReader();
    if (!reader) throw new FeedFetchError("That feed was empty.");
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new FeedFetchError("That feed is too large to import.");
      }
      chunks.push(value);
    }
    const text = new TextDecoder("utf-8").decode(Buffer.concat(chunks));
    return { text, finalUrl: url.toString() };
  }
  throw new FeedFetchError("That feed redirects too many times.");
}
