/** What a show and an episode need before they can go out to podcast apps. Shared by the UI and the server. */

export type ReadinessShow = {
  id: string;
  title: string;
  description: string | null;
  author: string | null;
  owner_email: string | null;
  category: string | null;
  artwork_url: string | null;
  imported_from_feed: string | null;
  owner_verified_at: string | null;
};

export type Problem = { message: string; href?: string; fix?: string };

export function showProblems(show: ReadinessShow): Problem[] {
  const settings = `/app/shows/${show.id}/settings`;
  const problems: Problem[] = [];
  if (show.imported_from_feed && !show.owner_verified_at) {
    problems.push({
      message: "This show still lives at your old host. Moving it to Ospod (with a quick ownership check) arrives with the next update.",
    });
  }
  if (!show.artwork_url) problems.push({ message: "Add cover art (Apple Podcasts requires it).", href: settings, fix: "Add cover art" });
  if (!show.category) problems.push({ message: "Choose a category.", href: settings, fix: "Choose category" });
  if (!show.owner_email) problems.push({ message: "Add a contact email. Apple and Spotify use it to confirm you own the show.", href: settings, fix: "Add email" });
  if (!show.description?.trim()) problems.push({ message: "Write a show description.", href: settings, fix: "Add description" });
  if (!show.author?.trim()) problems.push({ message: "Add the host or author name.", href: settings, fix: "Add host" });
  return problems;
}

export type ReadinessEpisode = {
  title: string;
  audio_key: string | null;
  source_media_url: string | null;
  processing_stage: string | null;
};

export function episodeProblems(episode: ReadinessEpisode): Problem[] {
  const problems: Problem[] = [];
  if (episode.processing_stage && episode.processing_stage !== "ready") {
    problems.push({ message: episode.processing_stage === "failed" ? "Processing failed. Try again first." : "Wait for processing to finish." });
  } else if (!episode.audio_key && !episode.source_media_url) {
    problems.push({ message: "This episode has no audio yet." });
  }
  if (!episode.title.trim()) problems.push({ message: "Give the episode a title." });
  return problems;
}

export const PLATFORMS = [
  {
    id: "apple",
    name: "Apple Podcasts",
    submitUrl: "https://podcastsconnect.apple.com/",
    how: "Sign in to Podcasts Connect, click + then New Show, choose \"Add a show with an RSS feed\" and paste your feed address. Apple reviews new shows within a few days.",
  },
  {
    id: "spotify",
    name: "Spotify",
    submitUrl: "https://creators.spotify.com/",
    how: "In Spotify for Creators, choose \"Find an existing show\", paste your feed address and confirm with the code Spotify emails to your contact email.",
  },
  {
    id: "youtube_music",
    name: "YouTube Music",
    submitUrl: "https://studio.youtube.com/",
    how: "In YouTube Studio, click Create, then New podcast, then \"Submit RSS feed\", and paste your feed address.",
  },
  {
    id: "amazon",
    name: "Amazon Music and Audible",
    submitUrl: "https://podcasters.amazon.com/",
    how: "Sign in to Amazon Music for Podcasters, click \"Add your podcast\" and paste your feed address.",
  },
  {
    id: "iheart",
    name: "iHeartRadio",
    submitUrl: "https://www.iheart.com/content/submit-your-podcast/",
    how: "Fill in iHeart's submission form with your feed address.",
  },
  {
    id: "pocket_casts",
    name: "Pocket Casts",
    submitUrl: "https://pocketcasts.com/submit/",
    how: "Paste your feed address into Pocket Casts' submit page.",
  },
  {
    id: "podcast_index",
    name: "Podcast Index (Overcast, Fountain, Podverse and more)",
    submitUrl: "https://podcastindex.org/add",
    how: "Add your feed to the Podcast Index. Dozens of independent apps read from it.",
  },
  {
    id: "deezer",
    name: "Deezer",
    submitUrl: "https://podcasters.deezer.com/",
    how: "Sign in to Deezer for Podcasters and submit your feed address.",
  },
] as const;

export type PlatformId = (typeof PLATFORMS)[number]["id"];

/** True once an episode is in the public feed (published, or scheduled and its time has come). */
export function isLiveNow(status: string, publishedAt: string | null): boolean {
  if (!publishedAt) return false;
  return (status === "published" || status === "scheduled") && new Date(publishedAt).getTime() <= Date.now();
}
