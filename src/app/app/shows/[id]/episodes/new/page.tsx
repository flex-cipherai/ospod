import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Notice, Skeleton } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { r2Config } from "@/lib/media/r2";
import { EpisodeUploader } from "./uploader";

export const metadata: Metadata = { title: "New episode" };

export default function NewEpisodePage({ params }: PageProps<"/app/shows/[id]/episodes/new">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 max-w-3xl rounded-[20px]" />}>
      <NewEpisode params={params} />
    </Suspense>
  );
}

async function NewEpisode({ params }: { params: PageProps<"/app/shows/[id]/episodes/new">["params"] }) {
  const [{ id }, workspace] = await Promise.all([params, requireWorkspace("editor")]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: show } = await supabase.from("shows").select("id, title").eq("id", id).eq("workspace_id", workspace.id).maybeSingle();
  if (!show) notFound();

  const allowVideo = workspace.plan !== "starter" || workspace.plan_status === "trialing";

  return (
    <>
      <Link href={`/app/shows/${show.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" /> {show.title}
      </Link>
      <PageHeader title="New episode" description="Upload your finished episode. Ospod handles the rest." />
      {r2Config() ? (
        <EpisodeUploader showId={show.id} allowVideo={allowVideo} />
      ) : (
        <Notice tone="gold" className="max-w-3xl">
          Uploading isn't switched on yet: media storage still needs to be connected. This is a one-time setup step for the
          Ospod team.
        </Notice>
      )}
    </>
  );
}
