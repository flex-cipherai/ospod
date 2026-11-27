"use client";

import { useActionState, useState } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { Label, Notice, buttonClass, inputClass } from "@/components/ui";
import type { EpisodeFormState } from "../actions";
import { clock } from "@/lib/podcast-meta";

type Chapter = { start: number; title: string };

export type EpisodeEditorValues = {
  title: string;
  description: string;
  episode_type: "full" | "trailer" | "bonus";
  season_number: number | null;
  episode_number: number | null;
  explicit: boolean;
  chapters: Chapter[];
};

export type AiDraft = { titles: string[]; show_notes: string | null; chapters: Chapter[]; summary: string | null } | null;

/** "1:02:03" / "62:03" / "45" → seconds, or null. */
function parseClock(v: string): number | null {
  const parts = v.trim().split(":").map((p) => Number(p));
  if (parts.length === 0 || parts.length > 3 || parts.some((p) => !Number.isFinite(p) || p < 0)) return null;
  return parts.reduce((t, p) => t * 60 + p, 0);
}

function Suggestion({ children, onUse, label }: { children: React.ReactNode; onUse: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onUse}
      className="flex w-full items-start gap-2 rounded-xl border border-periwinkle/50 bg-periwinkle-soft/60 px-3 py-2 text-left text-[15px] hover:border-ink"
      aria-label={label}
    >
      <Sparkles size={16} className="mt-0.5 shrink-0 text-focus" aria-hidden="true" />
      <span>{children}</span>
    </button>
  );
}

export function EpisodeEditor({
  action,
  initial,
  draft,
  readOnly,
}: {
  action: (prev: EpisodeFormState, form: FormData) => Promise<EpisodeFormState>;
  initial: EpisodeEditorValues;
  draft: AiDraft;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [title, setTitle] = useState(initial.title);
  const [notes, setNotes] = useState(initial.description);
  const [chapters, setChapters] = useState<Chapter[]>(initial.chapters);
  const [chapterText, setChapterText] = useState<string[]>(initial.chapters.map((c) => clock(c.start)));
  const [explicit, setExplicit] = useState(initial.explicit);
  const fe = state.fieldErrors ?? {};

  const setAllChapters = (next: Chapter[]) => {
    setChapters(next);
    setChapterText(next.map((c) => clock(c.start)));
  };

  return (
    <form action={formAction} className="space-y-8" noValidate>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.saved && <Notice tone="success">Saved.</Notice>}
      <fieldset disabled={readOnly || pending} className="space-y-8">
        <div>
          <Label htmlFor="title">Title</Label>
          <input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} className={inputClass} aria-invalid={fe.title ? true : undefined} />
          {fe.title && <p className="mt-1.5 text-sm text-danger">{fe.title}</p>}
          {draft && draft.titles.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-semibold text-muted">Title ideas from Ospod</p>
              {draft.titles
                .filter((t) => t !== title)
                .slice(0, 4)
                .map((t) => (
                  <Suggestion key={t} onUse={() => setTitle(t)} label={`Use title: ${t}`}>
                    {t}
                  </Suggestion>
                ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <Label htmlFor="description">Show notes</Label>
            {draft?.show_notes && draft.show_notes !== notes && (
              <button type="button" onClick={() => setNotes(draft.show_notes ?? "")} className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-focus hover:underline">
                <Sparkles size={14} aria-hidden="true" /> Use Ospod's draft
              </button>
            )}
          </div>
          <textarea
            id="description"
            name="description"
            rows={12}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={20000}
            className={clsx(inputClass, "h-auto py-3 font-[inherit] leading-relaxed")}
            aria-describedby="notes-hint"
          />
          <p id="notes-hint" className="mt-1.5 text-sm text-muted">
            Podcast apps show these under the episode. Use **bold**, *italics*, "- " for bullet points and plain links.
          </p>
          {fe.description && <p className="mt-1.5 text-sm text-danger">{fe.description}</p>}
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <p className="text-[15px] font-semibold">Chapters</p>
            {draft && draft.chapters.length > 0 && JSON.stringify(draft.chapters) !== JSON.stringify(chapters) && (
              <button type="button" onClick={() => setAllChapters(draft.chapters)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-focus hover:underline">
                <Sparkles size={14} aria-hidden="true" /> Use Ospod's {draft.chapters.length} chapters
              </button>
            )}
          </div>
          <p className="mb-3 text-sm text-muted">Apple Podcasts, Spotify and YouTube let listeners jump between chapters.</p>
          <ul className="space-y-2">
            {chapters.map((c, i) => (
              <li key={i} className="flex gap-2">
                <label className="sr-only" htmlFor={`chapter-start-${i}`}>
                  Chapter {i + 1} start time
                </label>
                <input
                  id={`chapter-start-${i}`}
                  value={chapterText[i] ?? ""}
                  onChange={(e) => {
                    const text = [...chapterText];
                    text[i] = e.target.value;
                    setChapterText(text);
                    const seconds = parseClock(e.target.value);
                    if (seconds !== null) setChapters(chapters.map((x, j) => (j === i ? { ...x, start: seconds } : x)));
                  }}
                  placeholder="0:00"
                  className={clsx(inputClass, "w-28! shrink-0 tabular-nums")}
                />
                <label className="sr-only" htmlFor={`chapter-title-${i}`}>
                  Chapter {i + 1} title
                </label>
                <input
                  id={`chapter-title-${i}`}
                  value={c.title}
                  onChange={(e) => setChapters(chapters.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                  maxLength={120}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setAllChapters(chapters.filter((_, j) => j !== i))}
                  className={buttonClass({ variant: "ghost", className: "shrink-0 px-3" })}
                  aria-label={`Remove chapter ${i + 1}`}
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setAllChapters([...chapters, { start: chapters.length ? chapters[chapters.length - 1].start + 300 : 0, title: "" }])}
            className={buttonClass({ variant: "secondary", size: "sm", className: "mt-3" })}
          >
            <Plus size={16} aria-hidden="true" /> Add chapter
          </button>
          <input type="hidden" name="chapters" value={JSON.stringify(chapters.filter((c) => c.title.trim()))} />
          {fe.chapters && <p className="mt-1.5 text-sm text-danger">{fe.chapters}</p>}
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <Label htmlFor="episode_type">Type</Label>
            <select id="episode_type" name="episode_type" defaultValue={initial.episode_type} className={inputClass}>
              <option value="full">Full episode</option>
              <option value="trailer">Trailer</option>
              <option value="bonus">Bonus</option>
            </select>
          </div>
          <div>
            <Label htmlFor="season_number">Season (optional)</Label>
            <input id="season_number" name="season_number" type="number" min={1} defaultValue={initial.season_number ?? ""} className={inputClass} />
          </div>
          <div>
            <Label htmlFor="episode_number">Episode number (optional)</Label>
            <input id="episode_number" name="episode_number" type="number" min={1} defaultValue={initial.episode_number ?? ""} className={inputClass} />
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={explicit} onChange={(e) => setExplicit(e.target.checked)} className="mt-1 size-4 accent-ink" />
          <input type="hidden" name="explicit" value={explicit ? "yes" : "no"} />
          <span>
            <span className="block font-semibold">Contains explicit content</span>
            <span className="block text-sm text-muted">Strong language or adult themes in this episode.</span>
          </span>
        </label>
      </fieldset>

      {!readOnly && (
        <div className="flex items-center gap-4 border-t border-line pt-6">
          <button type="submit" disabled={pending} className={buttonClass({ size: "lg" })}>
            {pending ? "Saving…" : "Save episode"}
          </button>
          <p className="text-sm text-muted">Publish or schedule from the Publishing panel.</p>
        </div>
      )}
    </form>
  );
}
