"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, Check, Info, Loader2, Search } from "lucide-react";
import { clsx } from "clsx";
import { Artwork } from "@/components/artwork";
import { Card, Notice, buttonClass, inputClass } from "@/components/ui";
import type { DirectoryResult } from "@/lib/feeds/search";
import { findShow, importFeed, previewFeed, type FeedPreview } from "../actions";

const dateFmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

type Step = { name: "find" } | { name: "results"; results: DirectoryResult[] } | { name: "preview"; preview: FeedPreview };

export function ImportWizard() {
  const [query, setQuery] = useState("");
  const [step, setStep] = useState<Step>({ name: "find" });
  const [error, setError] = useState<string | null>(null);
  const [loadingFeed, setLoadingFeed] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();
  const [importing, startImport] = useTransition();

  const openFeed = (feedUrl: string) => {
    setError(null);
    setLoadingFeed(feedUrl);
    startSearch(async () => {
      const res = await previewFeed(feedUrl);
      setLoadingFeed(null);
      if (res.ok) setStep({ name: "preview", preview: res.preview });
      else setError(res.message);
    });
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startSearch(async () => {
      const res = await findShow(query);
      if (res.kind === "error") setError(res.message);
      else if (res.kind === "results") setStep({ name: "results", results: res.results });
      else {
        setLoadingFeed(res.feedUrl);
        const preview = await previewFeed(res.feedUrl);
        setLoadingFeed(null);
        if (preview.ok) setStep({ name: "preview", preview: preview.preview });
        else setError(preview.message);
      }
    });
  };

  const confirmImport = (feedUrl: string) => {
    setError(null);
    startImport(async () => {
      // On success the server redirects to the new show, so we only get here on failure.
      const res = await importFeed(feedUrl);
      if (res && !res.ok) setError(res.message);
    });
  };

  if (step.name === "preview") {
    const p = step.preview;
    return (
      <div className="max-w-3xl">
        <button
          type="button"
          onClick={() => setStep({ name: "find" })}
          disabled={importing}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate hover:text-ink disabled:opacity-50"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Not my show
        </button>
        <Card className="p-8">
          <div className="flex flex-wrap gap-6">
            <Artwork src={p.artworkUrl} alt={`${p.title} cover art`} size={140} />
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-sm font-semibold text-success">
                <Check size={16} className="mr-1 inline" aria-hidden="true" />
                Found your show
              </p>
              <h2 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{p.title}</h2>
              {p.author && <p className="mt-1 text-[16px] text-slate">{p.author}</p>}
              <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-sm text-muted">Episodes</dt>
                  <dd className="text-[22px] font-bold tabular-nums">{p.episodeCount.toLocaleString("en-US")}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Format</dt>
                  <dd className="text-[22px] font-bold">{p.format === "video" ? "Video" : "Audio"}</dd>
                </div>
                {p.oldest && (
                  <div>
                    <dt className="text-sm text-muted">Since</dt>
                    <dd className="text-[22px] font-bold">{new Date(p.oldest).getFullYear()}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {p.latest.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-3 text-sm font-semibold text-muted">Latest episodes</h3>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {p.latest.map((e) => (
                  <li key={e.title + e.publishedAt} className="flex justify-between gap-4 px-4 py-3 text-[15px]">
                    <span className="min-w-0 truncate font-medium">{e.title}</span>
                    <span className="shrink-0 text-muted">{dateFmt(e.publishedAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.movedTo && (
            <Notice tone="gold" className="mt-6">
              This feed says the show has moved to another address. If you've already moved hosts, paste the newer link
              instead.
            </Notice>
          )}
          {p.skipped > 0 && (
            <p className="mt-4 text-sm text-muted">
              {p.skipped} {p.skipped === 1 ? "item has" : "items have"} no audio or video file and will be skipped.
            </p>
          )}

          <div className="mt-8 flex items-start gap-3 rounded-xl bg-canvas p-4 text-[15px] text-slate">
            <Info size={18} className="mt-0.5 shrink-0 text-ink" aria-hidden="true" />
            <p>
              Importing copies your show into Ospod. It doesn't change anything on your current host, and your
              listeners keep getting episodes as usual. You'll move your feed to Ospod later, when you're ready.
            </p>
          </div>

          {error && (
            <Notice tone="error" className="mt-6">
              {error}
            </Notice>
          )}

          <button
            type="button"
            onClick={() => confirmImport(p.feedUrl)}
            disabled={importing}
            className={buttonClass({ size: "lg", className: "mt-6" })}
          >
            {importing ? (
              <>
                <Loader2 size={20} className="animate-spin" aria-hidden="true" /> Importing {p.episodeCount.toLocaleString("en-US")} episodes…
              </>
            ) : (
              `Import ${p.episodeCount.toLocaleString("en-US")} episodes`
            )}
          </button>
          {importing && <p className="mt-3 text-sm text-muted">This can take up to a minute for big shows. Please keep this page open.</p>}
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Card className="p-8">
        <form onSubmit={submitSearch} role="search">
          <label htmlFor="show-query" className="mb-2 block text-[17px] font-semibold">
            Find your show
          </label>
          <p id="show-query-hint" className="mb-4 text-[15px] text-slate">
            Type its name, or paste its RSS feed link or Apple Podcasts link.
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                id="show-query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. The Morning Show, or https://feeds.example.com/show.xml"
                aria-describedby="show-query-hint"
                autoComplete="off"
                autoFocus
                className={clsx(inputClass, "h-14 pl-11 text-[17px]")}
              />
            </div>
            <button type="submit" disabled={searching || !query.trim()} className={buttonClass({ size: "lg" })}>
              {searching && !loadingFeed ? <Loader2 size={20} className="animate-spin" aria-label="Searching" /> : "Find"}
            </button>
          </div>
        </form>

        {error && (
          <Notice tone="error" className="mt-6">
            {error}
          </Notice>
        )}

        {step.name === "results" && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-muted">Is it one of these?</h2>
            <ul className="space-y-2">
              {step.results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => openFeed(r.feedUrl)}
                    disabled={searching}
                    className="flex w-full items-center gap-4 rounded-2xl border border-line p-3 text-left transition-colors hover:border-ink disabled:opacity-60"
                  >
                    <Artwork src={r.artworkUrl} alt="" size={56} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{r.title}</span>
                      <span className="block truncate text-sm text-muted">
                        {r.author}
                        {r.episodeCount ? ` · ${r.episodeCount.toLocaleString("en-US")} episodes` : ""}
                      </span>
                    </span>
                    {loadingFeed === r.feedUrl ? (
                      <Loader2 size={20} className="animate-spin text-muted" aria-label="Loading" />
                    ) : (
                      <span className={buttonClass({ variant: "secondary", size: "sm" })}>This one</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {searching && loadingFeed && step.name === "find" && (
          <p className="mt-6 flex items-center gap-2 text-[15px] text-slate" role="status">
            <Loader2 size={18} className="animate-spin" aria-hidden="true" /> Reading your feed…
          </p>
        )}
      </Card>

      <details className="mt-6 max-w-3xl rounded-2xl border border-line bg-white px-6 py-4 text-[15px]">
        <summary className="cursor-pointer font-semibold">Where do I find my RSS feed link?</summary>
        <p className="mt-3 text-slate">
          Every podcast host shows it in your show's settings, often under "Distribution", "RSS feed" or "Directories".
          It usually ends in <code className="rounded bg-canvas px-1">.xml</code> or <code className="rounded bg-canvas px-1">/rss</code>.
          If you're on Spotify for Creators, it's under Settings → Availability.
        </p>
      </details>
    </div>
  );
}
