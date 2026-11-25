import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Card, Label, Notice, Skeleton, buttonClass, inputClass } from "@/components/ui";
import { requireWorkspace, roleAtLeast } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FEED_HOST } from "@/lib/env";
import { deleteShow, updateShow } from "../../actions";
import { ArtworkUploader } from "../../artwork-uploader";
import { ShowForm, type ShowValues } from "../../show-form";

export const metadata: Metadata = { title: "Show settings" };

type ShowRow = Omit<ShowValues, "description" | "author" | "owner_email" | "subcategory" | "website_url" | "category"> & {
  id: string;
  workspace_id: string;
  artwork_url: string | null;
  status: "draft" | "active" | "archived";
  description: string | null;
  author: string | null;
  owner_email: string | null;
  category: string | null;
  subcategory: string | null;
  website_url: string | null;
};

export default function ShowSettingsPage({ params, searchParams }: PageProps<"/app/shows/[id]/settings">) {
  return (
    <Suspense fallback={<Skeleton className="h-[800px] rounded-[20px]" />}>
      <Settings params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Settings({
  params,
  searchParams,
}: {
  params: PageProps<"/app/shows/[id]/settings">["params"];
  searchParams: PageProps<"/app/shows/[id]/settings">["searchParams"];
}) {
  const [{ id }, query, workspace] = await Promise.all([params, searchParams, requireWorkspace("editor")]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data: show } = await supabase
    .from("shows")
    .select("id, workspace_id, title, description, author, owner_email, language, category, subcategory, explicit, format, show_type, website_url, feed_slug, artwork_url, status")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .maybeSingle<ShowRow>();
  if (!show) notFound();

  const canDelete = roleAtLeast(workspace.role, "admin");

  return (
    <>
      <Link href={`/app/shows/${show.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" /> {show.title}
      </Link>
      <PageHeader title="Show settings" description="How your show appears in Apple Podcasts, Spotify and every other app." />

      <div className="max-w-3xl space-y-6">
        <Card className="p-8">
          <ArtworkUploader workspaceId={show.workspace_id} showId={show.id} current={show.artwork_url} title={show.title} />
        </Card>

        <Card className="p-8">
          <ShowForm
            action={updateShow.bind(null, show.id)}
            mode="edit"
            feedHost={FEED_HOST}
            slugLocked={show.status !== "draft"}
            initial={{
              title: show.title,
              description: show.description ?? "",
              author: show.author ?? "",
              owner_email: show.owner_email ?? "",
              language: show.language,
              category: show.category ?? "",
              subcategory: show.subcategory ?? "",
              explicit: show.explicit,
              format: show.format,
              show_type: show.show_type,
              website_url: show.website_url ?? "",
              feed_slug: show.feed_slug,
            }}
          />
        </Card>

        {canDelete && (
          <Card className="border-danger/30 p-8">
            <h2 className="mb-2 text-[20px] font-bold tracking-[-0.015em] text-danger">Delete this show</h2>
            <p className="mb-5 text-[15px] text-slate">
              Removes the show and all its episodes from Ospod. This can't be undone.
              {show.status === "draft" && " Nothing changes on your current host."}
            </p>
            {query.delete === "mismatch" && (
              <Notice tone="error" className="mb-4">
                The name you typed didn't match, so nothing was deleted.
              </Notice>
            )}
            <form action={deleteShow.bind(null, show.id)} className="flex flex-wrap items-end gap-3">
              <div className="min-w-[260px] flex-1">
                <Label htmlFor="confirm">
                  Type <span className="font-bold">{show.title}</span> to confirm
                </Label>
                <input id="confirm" name="confirm" autoComplete="off" required className={inputClass} />
              </div>
              <button type="submit" className={buttonClass({ variant: "danger" })}>
                Delete show
              </button>
            </form>
          </Card>
        )}
      </div>
    </>
  );
}
