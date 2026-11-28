import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Clock, Radio, Settings, Upload } from "lucide-react";
import { Artwork } from "@/components/artwork";
import { Badge, Card, Notice, Skeleton, buttonClass } from "@/components/ui";
import { requireWorkspace, roleAtLeast } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { plainText } from "@/lib/feeds/parse";
import { formatDate, formatDuration, languageName } from "@/lib/podcast-meta";
import { FEED_HOST } from "@/lib/env";

export const metadata: Metadata = { title: "Show" };

const EPISODES_SHOWN = 100;

type Show = {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  artwork_url: string | null;
  format: "audio" | "video";
  status: "draft" | "active" | "archived";
  category: string | null;
  subcategory: string | null;
  language: string;
  feed_slug: string;
  imported_from_feed: string | null;
  imported_at: string | null;
};

type Episode = {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "processing" | "scheduled" | "published" | "failed";
  episode_type: "full" | "trailer" | "bonus";
  season_number: number | null;
  episode_number: number | null;
  published_at: string | null;
  duration_seconds: number | null;
  processing_stage: string | null;
};

const statusBadge = {
  draft: { tone: "neutral", label: "Draft" },
  processing: { tone: "gold", label: "Processing" },
  scheduled: { tone: "gold", label: "Scheduled" },
  published: { tone: "success", label: "Published" },
  failed: { tone: "danger", label: "Failed" },
} as const;

export default function ShowPage({ params, searchParams }: PageProps<"/app/shows/[id]">) {
  return (
    <>
      <Link href="/app/shows" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" /> Shows
      </Link>
      <Suspense fallback={<ShowSkeleton />}>
        <ShowContent params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ShowContent({
  params,
  searchParams,
}: {
  params: PageProps<"/app/shows/[id]">["params"];
  searchParams: PageProps<"/app/shows/[id]">["searchParams"];
}) {
  const [{ id }, query, workspace] = await Promise.all([params, searchParams, requireWorkspace()]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: show }, { data: episodes, count }] = await Promise.all([
    supabase
      .from("shows")
      .select("id, title, author, description, artwork_url, format, status, category, subcategory, language, feed_slug, imported_from_feed, imported_at")
      .eq("id", id)
      .eq("workspace_id", workspace.id)
      .maybeSingle<Show>(),
    supabase
      .from("episodes")
      .select("id, title, description, status, episode_type, season_number, episode_number, published_at, duration_seconds, processing_stage", { count: "exact" })
      .eq("show_id", id)
      .order("published_at", { ascending: false, nullsFirst: true })
      .order("created_at", { ascending: false })
      .limit(EPISODES_SHOWN)
      .returns<Episode[]>(),
  ]);
  if (!show) notFound();

  const canEdit = roleAtLeast(workspace.role, "editor");
  const total = count ?? 0;
  const importedCount = typeof query.imported === "string" ? Number(query.imported) : null;
  const firstEpisode = (episodes ?? []).find((e) => e.status === "draft" && (!e.processing_stage || e.processing_stage === "ready"));

  return (
    <>
      {importedCount !== null && (
        <Notice tone="success" className="mb-6">
          <strong>Imported {importedCount.toLocaleString("en-US")} episodes.</strong> Your show is in Ospod. Your current
          host still serves your listeners until you move your feed here.
        </Notice>
      )}
      {query.created && (
        <Notice tone="success" className="mb-6">
          <strong>Your show is ready.</strong> Add cover art in{" "}
          <Link href={`/app/shows/${show.id}/settings`} className="font-semibold underline">
            Settings
          </Link>{" "}
          so it looks right in every podcast app.
        </Notice>
      )}

      <header className="mb-8 flex flex-wrap items-start gap-6">
        <Artwork src={show.artwork_url} alt={`${show.title} cover art`} size={140} />
        <div className="min-w-0 flex-1">
          <h1 className="text-[34px] leading-tight font-bold tracking-[-0.025em]">{show.title}</h1>
          {show.author && <p className="mt-1 text-[17px] text-slate">{show.author}</p>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge>{show.format === "video" ? "Video" : "Audio"}</Badge>
            {show.category && <Badge>{show.subcategory ? `${show.category} · ${show.subcategory}` : show.category}</Badge>}
            <Badge>{languageName(show.language)}</Badge>
            {show.status === "draft" ? (
              <Badge tone="gold">Not live on Ospod yet</Badge>
            ) : (
              <Badge tone="success">Live</Badge>
            )}
          </div>
          {show.description && <p className="mt-4 max-w-3xl text-[15px] text-slate">{plainText(show.description, 280)}</p>}
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-3">
            <Link href={`/app/shows/${show.id}/settings`} className={buttonClass({ variant: "secondary" })}>
              <Settings size={18} aria-hidden="true" /> Show settings
            </Link>
            <Link href={`/app/shows/${show.id}/distribution`} className={buttonClass({ variant: "secondary" })}>
              <Radio size={18} aria-hidden="true" /> Distribution
            </Link>
            <Link href={`/app/shows/${show.id}/episodes/new`} className={buttonClass()}>
              <Upload size={18} aria-hidden="true" /> New episode
            </Link>
          </div>
        )}
      </header>

      {show.status === "draft" && (
        <Card className="mb-8 flex flex-wrap items-center gap-4 border-l-[6px] border-l-gold p-6">
          <Clock size={22} className="shrink-0 text-gold-ink" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            {show.imported_from_feed ? (
              <>
                <p className="font-semibold">Next: move your feed to Ospod</p>
                <p className="text-[15px] text-slate">
                  Your listeners still get this show from your old host. Moving it to Ospod, with your listeners, reviews and
                  rankings, arrives with the next update.
                </p>
              </>
            ) : firstEpisode ? (
              <>
                <p className="font-semibold">Next: publish your first episode</p>
                <p className="text-[15px] text-slate">
                  Open the episode and click <strong>Publish now</strong> in its Publishing panel. Your feed goes live at{" "}
                  {FEED_HOST}/{show.feed_slug} at the same moment.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold">Next: upload your first episode</p>
                <p className="text-[15px] text-slate">Ospod prepares it and drafts the title and show notes. Then you publish.</p>
              </>
            )}
          </div>
          {!show.imported_from_feed && canEdit && (
            <Link
              href={firstEpisode ? `/app/shows/${show.id}/episodes/${firstEpisode.id}` : `/app/shows/${show.id}/episodes/new`}
              className={buttonClass({ variant: "gold" })}
            >
              {firstEpisode ? "Open episode" : "Upload episode"}
            </Link>
          )}
        </Card>
      )}

      <section aria-labelledby="episodes-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 id="episodes-heading" className="text-[22px] font-bold tracking-[-0.015em]">
            Episodes <span className="font-medium text-muted">({total.toLocaleString("en-US")})</span>
          </h2>
        </div>

        {total === 0 ? (
          <Card className="px-8 py-14 text-center">
            <p className="text-[17px] font-semibold">No episodes yet</p>
            <p className="mt-1 text-[15px] text-slate">Upload your first one and Ospod drafts the title, show notes and chapters.</p>
            {canEdit && (
              <Link href={`/app/shows/${show.id}/episodes/new`} className={buttonClass({ className: "mt-5" })}>
                <Upload size={18} aria-hidden="true" /> Upload an episode
              </Link>
            )}
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-left text-[15px]">
              <thead className="border-b border-line bg-canvas/60 text-sm text-muted">
                <tr>
                  <th scope="col" className="px-6 py-3 font-semibold">Episode</th>
                  <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">Published</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Length</th>
                  <th scope="col" className="px-6 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {(episodes ?? []).map((e) => (
                  <tr key={e.id} className="border-b border-line align-top last:border-0">
                    <td className="max-w-0 px-6 py-3.5">
                      <Link href={`/app/shows/${show.id}/episodes/${e.id}`} className="block truncate font-semibold hover:underline">
                        {e.episode_number && <span className="mr-1.5 text-muted tabular-nums">#{e.episode_number}</span>}
                        {e.title}
                      </Link>
                      {e.description && <p className="truncate text-sm text-muted">{plainText(e.description, 160)}</p>}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate">{formatDate(e.published_at)}</td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap text-slate tabular-nums">{formatDuration(e.duration_seconds)}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {e.processing_stage && e.processing_stage !== "ready" ? (
                          <Badge tone={e.processing_stage === "failed" ? "danger" : "gold"}>
                            {e.processing_stage === "failed" ? "Needs attention" : e.processing_stage === "uploading" ? "Uploading" : "Processing"}
                          </Badge>
                        ) : (
                          <Badge tone={statusBadge[e.status].tone}>{statusBadge[e.status].label}</Badge>
                        )}
                        {e.episode_type !== "full" && <Badge>{e.episode_type === "trailer" ? "Trailer" : "Bonus"}</Badge>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {total > EPISODES_SHOWN && (
              <p className="border-t border-line px-6 py-4 text-sm text-muted">
                Showing the latest {EPISODES_SHOWN} of {total.toLocaleString("en-US")} episodes.
              </p>
            )}
          </Card>
        )}
      </section>
    </>
  );
}

function ShowSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading show">
      <div className="mb-8 flex gap-6">
        <Skeleton className="size-[140px] rounded-2xl" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-64" />
        </div>
      </div>
      <Skeleton className="h-96 rounded-[20px]" />
    </div>
  );
}
