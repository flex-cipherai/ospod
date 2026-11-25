"use client";

import { useRef, useState } from "react";
import { clsx } from "clsx";
import { clock } from "@/lib/podcast-meta";

type Segment = { start: number; end: number; speaker: number; text: string };


const SPEAKER_COLORS = ["bg-ink text-white", "bg-gold text-ink", "bg-periwinkle text-ink", "bg-success text-white", "bg-slate text-white"];

/** Audio player with a transcript you can click to jump around. */
export function MediaTranscript({
  audioUrl,
  segments,
  chapters,
}: {
  audioUrl: string | null;
  segments: Segment[];
  chapters: { start: number; title: string }[];
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [now, setNow] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const seek = (t: number) => {
    if (!audio.current) return;
    audio.current.currentTime = t;
    void audio.current.play();
  };
  const shown = expanded ? segments : segments.slice(0, 12);

  return (
    <div className="space-y-6">
      {audioUrl && (
        <div>
          <audio ref={audio} src={audioUrl} controls preload="metadata" className="w-full" onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}>
            Your browser can't play this audio.
          </audio>
          {chapters.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Chapters">
              {chapters.map((c) => (
                <li key={`${c.start}-${c.title}`}>
                  <button
                    type="button"
                    onClick={() => seek(c.start)}
                    className="rounded-full border border-line px-3 py-1 text-sm hover:border-ink"
                  >
                    <span className="mr-1.5 text-muted tabular-nums">{clock(c.start)}</span>
                    {c.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {segments.length > 0 && (
        <div>
          <h3 className="mb-3 text-[17px] font-bold">Transcript</h3>
          <ol className="space-y-3">
            {shown.map((s, i) => {
              const playing = audioUrl && now >= s.start && now < s.end;
              return (
                <li key={i} className={clsx("grid grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-lg p-2", playing && "bg-gold-soft/70")}>
                  <button
                    type="button"
                    onClick={() => seek(s.start)}
                    disabled={!audioUrl}
                    className="self-start text-left text-sm text-muted tabular-nums hover:text-ink disabled:hover:text-muted"
                    aria-label={`Play from ${clock(s.start)}`}
                  >
                    {clock(s.start)}
                  </button>
                  <p className="text-[15px] leading-relaxed">
                    <span className={clsx("mr-2 rounded px-1.5 py-0.5 text-xs font-semibold", SPEAKER_COLORS[s.speaker % SPEAKER_COLORS.length])}>
                      Speaker {s.speaker + 1}
                    </span>
                    {s.text}
                  </p>
                </li>
              );
            })}
          </ol>
          {segments.length > 12 && (
            <button type="button" onClick={() => setExpanded((e) => !e)} className="mt-3 text-sm font-semibold text-ink underline underline-offset-2">
              {expanded ? "Show less" : `Show the full transcript (${segments.length} parts)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
