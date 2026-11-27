"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarClock, CheckCircle2, CircleAlert, Copy, Loader2, Radio, Send } from "lucide-react";
import { Label, Notice, buttonClass, inputClass } from "@/components/ui";
import type { Problem } from "@/lib/publishing";
import { publishEpisode, unpublishEpisode } from "../actions";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** datetime-local value for "tomorrow at 06:00" in the viewer's own time zone. */
function defaultScheduleValue() {
  const d = new Date(Date.now() + 86_400_000);
  d.setHours(6, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PublishPanel({
  episodeId,
  status,
  live,
  publishedAt,
  problems,
  feedUrl,
  distributionHref,
  canEdit,
}: {
  episodeId: string;
  status: "draft" | "processing" | "scheduled" | "published" | "failed";
  live: boolean;
  publishedAt: string | null;
  problems: Problem[];
  feedUrl: string | null;
  distributionHref: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);
  const [scheduling, setScheduling] = useState(false);
  const [when, setWhen] = useState(defaultScheduleValue);
  const [copied, setCopied] = useState(false);

  const run = (target: string | null) =>
    start(async () => {
      setErrors([]);
      const res = await publishEpisode(episodeId, target);
      if (!res.ok) setErrors(res.problems);
      else {
        setScheduling(false);
        router.refresh();
      }
    });

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Radio size={18} className="text-gold-ink" aria-hidden="true" />
        <h3 className="text-[17px] font-bold">Publishing</h3>
      </div>

      {live ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 font-semibold text-success">
            <CheckCircle2 size={18} aria-hidden="true" /> Live in your feed
          </p>
          {publishedAt && <p className="text-sm text-slate">Published {fmt(publishedAt)}. Podcast apps pick it up within minutes to a few hours.</p>}
        </div>
      ) : status === "scheduled" && publishedAt ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 font-semibold">
            <CalendarClock size={18} className="text-gold-ink" aria-hidden="true" /> Scheduled
          </p>
          <p className="text-sm text-slate">Goes live {fmt(publishedAt)}, automatically.</p>
          {canEdit && (
            <button type="button" disabled={pending} onClick={() => run(null)} className={buttonClass({ variant: "secondary", size: "sm" })}>
              Publish now instead
            </button>
          )}
        </div>
      ) : problems.length > 0 ? (
        <div>
          <p className="mb-3 text-sm text-slate">Before this episode can go out to podcast apps:</p>
          <ul className="space-y-2">
            {problems.map((p) => (
              <li key={p.message} className="flex items-start gap-2 text-[15px]">
                <CircleAlert size={18} className="mt-0.5 shrink-0 text-gold-ink" aria-hidden="true" />
                <span>
                  {p.message}{" "}
                  {p.href && p.fix && (
                    <Link href={p.href} className="font-semibold text-ink underline underline-offset-2">
                      {p.fix}
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : canEdit ? (
        <div className="space-y-4">
          <p className="text-sm text-slate">Ready to go. It will appear in Apple Podcasts, Spotify and every app your show is listed in.</p>
          {!scheduling ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={pending} onClick={() => run(null)} className={buttonClass({ variant: "gold" })}>
                {pending ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
                Publish now
              </button>
              <button type="button" disabled={pending} onClick={() => setScheduling(true)} className={buttonClass({ variant: "secondary" })}>
                <CalendarClock size={18} aria-hidden="true" /> Schedule
              </button>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl bg-canvas p-4">
              <div>
                <Label htmlFor="publish-at">Go live on</Label>
                <input
                  id="publish-at"
                  type="datetime-local"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                  className={inputClass}
                />
                <p className="mt-1.5 text-sm text-muted">Your local time.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending || !when}
                  onClick={() => run(new Date(when).toISOString())}
                  className={buttonClass()}
                >
                  {pending && <Loader2 size={18} className="animate-spin" aria-hidden="true" />} Schedule
                </button>
                <button type="button" onClick={() => setScheduling(false)} className={buttonClass({ variant: "ghost" })}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate">Not published yet.</p>
      )}

      {errors.length > 0 && (
        <Notice tone="error" className="mt-4">
          <ul className="list-disc space-y-1 pl-5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Notice>
      )}

      {feedUrl && (live || status === "scheduled") && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="mb-1.5 text-sm font-semibold text-muted">Your show's feed</p>
          <div className="flex gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-canvas px-3 py-2 text-sm">{feedUrl}</code>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(feedUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className={buttonClass({ variant: "secondary", size: "sm" })}
            >
              <Copy size={16} aria-hidden="true" /> {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <Link href={distributionHref} className="mt-2 inline-block text-sm font-semibold text-ink underline underline-offset-2">
            List your show in podcast apps
          </Link>
        </div>
      )}

      {canEdit && (live || status === "scheduled") && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-danger">{live ? "Unpublish…" : "Cancel schedule…"}</summary>
          <div className="mt-2 rounded-xl bg-danger-soft p-3 text-sm text-danger">
            <p className="mb-2">
              {live
                ? "Removes it from your feed. Apps stop showing it after their next check, but listeners who downloaded it keep their copy."
                : "Keeps the episode as a draft."}
            </p>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await unpublishEpisode(episodeId);
                  router.refresh();
                })
              }
              className={buttonClass({ variant: "danger", size: "sm" })}
            >
              {live ? "Yes, unpublish" : "Yes, cancel"}
            </button>
          </div>
        </details>
      )}
    </div>
  );
}
