import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Artwork } from "@/components/artwork";
import { Badge, Notice, Skeleton, buttonClass } from "@/components/ui";
import { AddShowChoices } from "./add-show-choices";
import { requireWorkspace, roleAtLeast } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Shows" };

type ShowRow = {
  id: string;
  title: string;
  author: string | null;
  artwork_url: string | null;
  format: "audio" | "video";
  status: "draft" | "active" | "archived";
  imported_from_feed: string | null;
  episodes: { count: number }[];
};

export default function ShowsPage({ searchParams }: PageProps<"/app/shows">) {
  return (
    <Suspense fallback={<ShowsSkeleton />}>
      <Shows searchParams={searchParams} />
    </Suspense>
  );
}

async function Shows({ searchParams }: { searchParams: PageProps<"/app/shows">["searchParams"] }) {
  const workspace = await requireWorkspace();
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("shows")
    .select("id, title, author, artwork_url, format, status, imported_from_feed, episodes(count)")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: true });
  const shows = (data ?? []) as unknown as ShowRow[];
  const canEdit = roleAtLeast(workspace.role, "editor");

  if (shows.length === 0) {
    return (
      <>
        <PageHeader title="Shows" description="Bring your podcast into Ospod, or start a new one." />
        {canEdit ? <AddShowChoices /> : <Notice>No shows yet. Ask an editor in your workspace to add one.</Notice>}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Shows"
        description={`${shows.length} ${shows.length === 1 ? "show" : "shows"} in ${workspace.name}.`}
        actions={
          canEdit && (
            <Link href="/app/shows/new" className={buttonClass()}>
              <Plus size={18} aria-hidden="true" /> Add a show
            </Link>
          )
        }
      />
      {params.deleted && (
        <Notice tone="success" className="mb-6">
          The show was deleted.
        </Notice>
      )}
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shows.map((show) => (
          <li key={show.id}>
            <Link
              href={`/app/shows/${show.id}`}
              className="flex h-full gap-4 rounded-[20px] border border-line bg-white p-5 transition-colors hover:border-ink"
            >
              <Artwork src={show.artwork_url} alt="" size={88} />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[17px] font-bold">{show.title}</h2>
                {show.author && <p className="truncate text-sm text-muted">{show.author}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge>{show.format === "video" ? "Video" : "Audio"}</Badge>
                  <Badge>
                    {show.episodes[0]?.count ?? 0} {show.episodes[0]?.count === 1 ? "episode" : "episodes"}
                  </Badge>
                  {show.status === "draft" && <Badge tone="gold">{show.imported_from_feed ? "Imported" : "Draft"}</Badge>}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function ShowsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading shows">
      <Skeleton className="mb-8 h-12 w-64" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 rounded-[20px]" />
        ))}
      </div>
    </div>
  );
}

