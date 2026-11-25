import "server-only";

export type DirectoryResult = {
  id: number;
  title: string;
  author: string;
  feedUrl: string;
  artworkUrl: string | null;
  episodeCount: number | null;
};

type ItunesItem = {
  collectionId: number;
  collectionName?: string;
  trackName?: string;
  artistName?: string;
  feedUrl?: string;
  artworkUrl600?: string;
  artworkUrl100?: string;
  trackCount?: number;
};

const toResult = (r: ItunesItem): DirectoryResult | null =>
  r.feedUrl
    ? {
        id: r.collectionId,
        title: r.collectionName ?? r.trackName ?? "Untitled show",
        author: r.artistName ?? "",
        feedUrl: r.feedUrl,
        artworkUrl: r.artworkUrl600 ?? r.artworkUrl100 ?? null,
        episodeCount: r.trackCount ?? null,
      }
    : null;

async function itunes(path: string): Promise<ItunesItem[]> {
  const res = await fetch(`https://itunes.apple.com/${path}`, {
    signal: AbortSignal.timeout(10_000),
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Apple Podcasts search failed (${res.status})`);
  const json = (await res.json()) as { results?: ItunesItem[] };
  return json.results ?? [];
}

/** Searches the Apple Podcasts directory (public API, no key needed). */
export async function searchPodcasts(term: string): Promise<DirectoryResult[]> {
  const q = new URLSearchParams({ media: "podcast", entity: "podcast", limit: "8", term });
  return (await itunes(`search?${q}`)).map(toResult).filter((r): r is DirectoryResult => r !== null);
}

/** Turns an Apple Podcasts link (…/id123456789) into the show's RSS feed address. */
export async function feedFromApplePodcastsUrl(url: string): Promise<DirectoryResult | null> {
  const id = url.match(/\/id(\d+)/)?.[1];
  if (!id) return null;
  const results = await itunes(`lookup?id=${id}&entity=podcast`);
  return results.map(toResult).find((r) => r !== null) ?? null;
}
