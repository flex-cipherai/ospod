import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, CircleAlert, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Badge, Card, Notice, Skeleton, buttonClass, inputClass } from "@/components/ui";
import { requireWorkspace, roleAtLeast } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { feedUrl, feedsOnPermanentDomain } from "@/lib/feeds/urls";
import { PLATFORMS, showProblems, type ReadinessShow } from "@/lib/publishing";
import { setPlatformStatus } from "./actions";
import { CopyButton } from "./copy-button";

export const metadata: Metadata = { title: "Distribution" };

type Show = ReadinessShow & { workspace_id: string; feed_slug: string; feed_live_at: string | null };

export default function DistributionPage({ params }: PageProps<"/app/shows/[id]/distribution">) {
  return (
    <Suspense fallback={<Skeleton className="h-[700px] rounded-[20px]" />}>
      <Distribution params={params} />
    </Suspense>
  );
}

async function Distribution({ params }: { params: PageProps<"/app/shows/[id]/distribution">["params"] }) {
  const [{ id }, workspace] = await Promise.all([params, requireWorkspace()]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: show }, { data: listings }] = await Promise.all([
    supabase
      .from("shows")
      .select("id, workspace_id, title, description, author, owner_email, category, artwork_url, imported_from_feed, owner_verified_at, feed_slug, feed_live_at")
      .eq("id", id)
      .eq("workspace_id", workspace.id)
      .maybeSingle<Show>(),
    supabase.from("show_platforms").select("platform, status, url").eq("show_id", id),
  ]);
  if (!show) notFound();

  const canEdit = roleAtLeast(workspace.role, "editor");
  const url = feedUrl(show.feed_slug);
  const live = !!show.feed_live_at && (!show.imported_from_feed || !!show.owner_verified_at);
  const permanent = feedsOnPermanentDomain();
  const problems = showProblems(show);
  const byPlatform = new Map((listings ?? []).map((l) => [l.platform as string, l as { status: string; url: string | null }]));

  return (
    <>
      <Link href={`/app/shows/${show.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" /> {show.title}
      </Link>
      <PageHeader title="Distribution" description="Get your show into every podcast app. You do this once per app; new episodes then appear everywhere automatically." />

      <div className="max-w-4xl space-y-6">
        <Card className="p-8">
          <h2 className="mb-1 text-[20px] font-bold tracking-[-0.015em]">Your feed</h2>
          <p className="mb-4 text-[15px] text-slate">Podcast apps read your show from this address. You paste it into each app below.</p>

          {!live ? (
            <Notice tone="gold">
              {show.imported_from_feed
                ? "Your listeners still get this show from your old host. Moving it to Ospod arrives with the next update."
                : "Your feed goes live when you publish your first episode."}
            </Notice>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <code className="min-w-0 flex-1 truncate rounded-xl bg-canvas px-4 py-3 text-[15px]">{url}</code>
                <CopyButton text={url} label="Copy feed address" />
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-ink underline underline-offset-2">
                  View feed <ExternalLink size={14} aria-hidden="true" />
                </a>
                <a
                  href={`https://podba.se/validate/?url=${encodeURIComponent(url)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-ink underline underline-offset-2"
                >
                  Check it with a feed validator <ExternalLink size={14} aria-hidden="true" />
                </a>
              </div>
              {!permanent && (
                <Notice tone="error" className="mt-5">
                  <strong>Don't submit this feed yet.</strong> It's on a temporary address. Feed addresses can't change
                  once apps have them, so wait until Ospod's permanent feed address (feeds.ospod.io) is switched on.
                </Notice>
              )}
            </>
          )}

          {problems.length > 0 && (
            <ul className="mt-5 space-y-2">
              {problems.map((p) => (
                <li key={p.message} className="flex items-start gap-2 text-[15px]">
                  <CircleAlert size={18} className="mt-0.5 shrink-0 text-gold-ink" aria-hidden="true" />
                  <span>
                    {p.message}{" "}
                    {p.href && p.fix && (
                      <Link href={p.href} className="font-semibold underline underline-offset-2">
                        {p.fix}
                      </Link>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="px-8 pt-7 pb-4">
            <h2 className="text-[20px] font-bold tracking-[-0.015em]">Podcast apps</h2>
            <p className="mt-1 text-[15px] text-slate">
              Submit your feed to each one, then mark it here. Most approve within a day; Apple can take up to a week.
            </p>
          </div>
          <ul className="divide-y divide-line border-t border-line">
            {PLATFORMS.map((p, i) => {
              const listing = byPlatform.get(p.id);
              return (
                <li key={p.id} className="px-8 py-5">
                  <div className="flex flex-wrap items-start gap-4">
                    <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-canvas text-sm font-bold">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{p.name}</h3>
                        {listing?.status === "live" ? (
                          <Badge tone="success">Live</Badge>
                        ) : listing?.status === "submitted" ? (
                          <Badge tone="gold">Submitted</Badge>
                        ) : null}
                        {listing?.url && (
                          <a href={listing.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-ink underline underline-offset-2">
                            Open listing
                          </a>
                        )}
                      </div>
                      <p className="mt-1 text-[15px] text-slate">{p.how}</p>
                      {canEdit && live && (
                        <form action={setPlatformStatus.bind(null, show.id, p.id)} className="mt-3 flex flex-wrap items-end gap-2">
                          <label className="sr-only" htmlFor={`status-${p.id}`}>
                            Status on {p.name}
                          </label>
                          <select id={`status-${p.id}`} name="status" defaultValue={listing?.status ?? "none"} className="h-10 rounded-lg border-[1.5px] border-line-strong bg-white px-3 text-sm">
                            <option value="none">Not submitted</option>
                            <option value="submitted">Submitted</option>
                            <option value="live">Live</option>
                          </select>
                          <label className="sr-only" htmlFor={`url-${p.id}`}>
                            Link to your show on {p.name}
                          </label>
                          <input
                            id={`url-${p.id}`}
                            name="url"
                            type="url"
                            defaultValue={listing?.url ?? ""}
                            placeholder={`Link to your show on ${p.name} (optional)`}
                            className={`${inputClass} h-10 max-w-sm text-sm`}
                          />
                          <button type="submit" className={buttonClass({ variant: "secondary", size: "sm" })}>
                            Save
                          </button>
                        </form>
                      )}
                    </div>
                    {live && (
                      <a href={p.submitUrl} target="_blank" rel="noreferrer" className={buttonClass({ variant: "secondary", size: "sm" })}>
                        Open {p.name.split(" (")[0]} <ExternalLink size={14} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <p className="text-sm text-muted">
          Overcast, Castro, Podcast Addict and most other apps find your show through Apple Podcasts or the Podcast Index
          automatically. YouTube video uploads arrive with the next update.
        </p>
      </div>
    </>
  );
}
