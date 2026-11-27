import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, RotateCcw, Scissors } from "lucide-react";
import { Badge, Card, Notice, Skeleton, buttonClass } from "@/components/ui";
import { requireWorkspace, roleAtLeast } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { r2Config, signedDownloadUrl } from "@/lib/media/r2";
import { clock, formatDate, formatDuration } from "@/lib/podcast-meta";
import { isStuck } from "@/lib/processing";
import { deleteEpisode, retryProcessing, saveEpisode } from "../actions";
import { EpisodeEditor, type AiDraft } from "./episode-editor";
import { MediaTranscript } from "./media-transcript";
import { ProcessingStatus } from "./processing-status";

export const metadata: Metadata = { title: "Episode" };

type Chapter = { start: number; title: string };
type Episode = {
  id: string;
  show_id: string;
  title: string;
  description: string | null;
  status: string;
  episode_type: "full" | "trailer" | "bonus";
  season_number: number | null;
  episode_number: number | null;
  explicit: boolean | null;
  chapters: Chapter[];
  duration_seconds: number | null;
  published_at: string | null;
  media_kind: "audio" | "video" | null;
  audio_key: string | null;
  audio_url: string | null;
  original_filename: string | null;
  processing_stage: string | null;
  processing_error: string | null;
  updated_at: string;
  imported: boolean;
  shows: { title: string; workspace_id: string };
};

export default function EpisodePage({ params, searchParams }: PageProps<"/app/shows/[id]/episodes/[episodeId]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[700px] rounded-[20px]" />}>
      <EpisodeContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EpisodeContent({
  params,
  searchParams,
}: {
  params: PageProps<"/app/shows/[id]/episodes/[episodeId]">["params"];
  searchParams: PageProps<"/app/shows/[id]/episodes/[episodeId]">["searchParams"];
}) {
  const [{ id, episodeId }, query, workspace] = await Promise.all([params, searchParams, requireWorkspace()]);
  if (!/^[0-9a-f-]{36}$/i.test(episodeId)) notFound();

  const supabase = await createClient();
  const { data: episode } = await supabase
    .from("episodes")
    .select(
      "id, show_id, title, description, status, episode_type, season_number, episode_number, explicit, chapters, duration_seconds, published_at, media_kind, audio_key, audio_url, original_filename, processing_stage, processing_error, imported, updated_at, shows!inner(title, workspace_id)",
    )
    .eq("id", episodeId)
    .eq("show_id", id)
    .eq("shows.workspace_id", workspace.id)
    .maybeSingle<Episode>();
  if (!episode) notFound();

  const canEdit = roleAtLeast(workspace.role, "editor");
  const stage = episode.processing_stage;
  const processing = stage !== null && stage !== "ready" && stage !== "failed";
  const stuck = isStuck(stage, episode.updated_at);

  const [{ data: draft }, { data: transcript }] = await Promise.all([
    supabase.from("episode_ai_drafts").select("titles, summary, show_notes, chapters, clip_ideas").eq("episode_id", episodeId).maybeSingle(),
    supabase.from("episode_transcripts").select("segments, language, speakers").eq("episode_id", episodeId).maybeSingle(),
  ]);

  const audioUrl = episode.audio_key && r2Config() ? await signedDownloadUrl(episode.audio_key, 60 * 60 * 6) : episode.audio_url;
  const clipIdeas = (draft?.clip_ideas ?? []) as { start: number; end: number; hook: string; why: string }[];

  return (
    <>
      <Link href={`/app/shows/${episode.show_id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" /> {episode.shows.title}
      </Link>

      <header className="mb-8">
        <h1 className="text-[34px] leading-tight font-bold tracking-[-0.025em]">{episode.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
          {episode.media_kind && <Badge>{episode.media_kind === "video" ? "Video" : "Audio"}</Badge>}
          {episode.duration_seconds ? <Badge>{formatDuration(episode.duration_seconds)}</Badge> : null}
          {episode.status === "published" ? <Badge tone="success">Published {formatDate(episode.published_at)}</Badge> : <Badge tone="gold">Draft</Badge>}
          {episode.imported && <Badge>Imported</Badge>}
          {episode.original_filename && <span>From {episode.original_filename}</span>}
        </div>
      </header>

      {query.uploaded && processing && (
        <Notice tone="success" className="mb-6">
          <strong>Upload complete.</strong> Ospod is preparing your episode now.
        </Notice>
      )}

      {processing && (
        <Card className="mb-8 max-w-3xl p-8">
          <h2 className="mb-6 text-[22px] font-bold tracking-[-0.015em]">Ospod is working on your episode</h2>
          <ProcessingStatus stage={stage!} />
          {stuck && (
            <div className="mt-6 rounded-xl bg-gold-soft p-4">
              <p className="font-semibold text-gold-ink">This is taking longer than usual to start.</p>
              {canEdit && (
                <form action={retryProcessing.bind(null, episode.id)} className="mt-3">
                  <button type="submit" className={buttonClass({ variant: "secondary", size: "sm" })}>
                    <RotateCcw size={16} aria-hidden="true" /> Try again
                  </button>
                </form>
              )}
            </div>
          )}
        </Card>
      )}

      {stage === "failed" && (
        <Card className="mb-8 max-w-3xl border-l-[6px] border-l-danger p-6">
          <p className="font-semibold text-danger">Processing didn't finish</p>
          <p className="mt-1 text-[15px] text-slate">{episode.processing_error ?? "Something went wrong."}</p>
          {canEdit && (
            <form action={retryProcessing.bind(null, episode.id)} className="mt-4">
              <button type="submit" className={buttonClass({ variant: "secondary" })}>
                <RotateCcw size={16} aria-hidden="true" /> Try again
              </button>
            </form>
          )}
        </Card>
      )}

      {stage === "ready" && draft && query.uploaded === undefined && episode.status === "draft" && (
        <Notice tone="info" className="mb-6 max-w-3xl">
          Ospod drafted the title, show notes and chapters below. Change anything you like, then save.
        </Notice>
      )}

      {!processing && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Card className="p-8">
            <EpisodeEditor
              action={saveEpisode.bind(null, episode.id)}
              readOnly={!canEdit}
              draft={
                draft
                  ? ({
                      titles: (draft.titles ?? []) as string[],
                      show_notes: draft.show_notes,
                      chapters: (draft.chapters ?? []) as Chapter[],
                      summary: draft.summary,
                    } satisfies NonNullable<AiDraft>)
                  : null
              }
              initial={{
                title: episode.title,
                description: episode.description ?? "",
                episode_type: episode.episode_type,
                season_number: episode.season_number,
                episode_number: episode.episode_number,
                explicit: episode.explicit ?? false,
                chapters: episode.chapters ?? [],
              }}
            />
          </Card>

          <div className="space-y-6">
            {(audioUrl || transcript) && (
              <Card className="p-6">
                <MediaTranscript
                  audioUrl={audioUrl}
                  segments={(transcript?.segments ?? []) as { start: number; end: number; speaker: number; text: string }[]}
                  chapters={episode.chapters ?? []}
                />
              </Card>
            )}

            {clipIdeas.length > 0 && (
              <Card className="p-6">
                <div className="mb-3 flex items-center gap-2">
                  <Scissors size={18} className="text-gold-ink" aria-hidden="true" />
                  <h3 className="text-[17px] font-bold">Moments worth clipping</h3>
                </div>
                <p className="mb-4 text-sm text-muted">Turning these into captioned vertical clips arrives with Clips.</p>
                <ul className="space-y-3">
                  {clipIdeas.map((c, i) => (
                    <li key={i} className="rounded-xl border border-line p-3">
                      <p className="text-sm text-muted tabular-nums">
                        {clock(c.start)}–{clock(c.end)}
                      </p>
                      <p className="font-semibold">{c.hook}</p>
                      <p className="text-sm text-slate">{c.why}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {canEdit && (
              <Card className="p-6">
                <h3 className="mb-1 text-[17px] font-bold">Delete episode</h3>
                <p className="mb-4 text-sm text-slate">Removes this episode and its files from Ospod.</p>
                <details>
                  <summary className={buttonClass({ variant: "ghost", size: "sm", className: "cursor-pointer list-none text-danger" })}>
                    Delete episode…
                  </summary>
                  <form action={deleteEpisode.bind(null, episode.id)} className="mt-3 rounded-xl bg-danger-soft p-4">
                    <p className="mb-3 text-sm text-danger">This can't be undone.</p>
                    <button type="submit" className={buttonClass({ variant: "danger", size: "sm" })}>
                      Yes, delete it
                    </button>
                  </form>
                </details>
              </Card>
            )}
          </div>
        </div>
      )}
    </>
  );
}
