"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileAudio, Loader2, UploadCloud, X } from "lucide-react";
import { clsx } from "clsx";
import { Card, Notice, buttonClass } from "@/components/ui";
import { cancelEpisodeUpload, finishEpisodeUpload, signEpisodeParts, startEpisodeUpload } from "../actions";

const CONCURRENCY = 4;
const MAX_TRIES = 5;

type Phase = { name: "idle" } | { name: "uploading"; file: File; episodeId: string; sent: number } | { name: "finishing"; file: File };

const formatBytes = (n: number) =>
  n >= 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(2)} GB` : n >= 1024 ** 2 ? `${(n / 1024 ** 2).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

/** PUTs one part with progress, resolving to its ETag. */
function putPart(url: string, blob: Blob, onProgress: (loaded: number) => void, xhrs: Set<XMLHttpRequest>): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhrs.add(xhr);
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => {
      xhrs.delete(xhr);
      const etag = xhr.getResponseHeader("ETag");
      if (xhr.status >= 200 && xhr.status < 300 && etag) resolve(etag);
      else reject(new Error(etag ? `status ${xhr.status}` : "missing ETag (check the bucket's CORS settings)"));
    };
    xhr.onerror = () => {
      xhrs.delete(xhr);
      reject(new Error("network"));
    };
    xhr.onabort = () => {
      xhrs.delete(xhr);
      reject(new Error("aborted"));
    };
    xhr.send(blob);
  });
}

export function EpisodeUploader({ showId, allowVideo }: { showId: string; allowVideo: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const xhrs = useRef(new Set<XMLHttpRequest>());
  const cancelled = useRef(false);
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const busy = phase.name !== "idle";
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      cancelled.current = false;
      if (!allowVideo && file.type.startsWith("video/")) {
        setError("Video podcasts are included from the Creator plan. Upload an audio file, or upgrade.");
        return;
      }
      const start = await startEpisodeUpload(showId, { name: file.name, size: file.size, type: file.type });
      if (!start.ok) return setError(start.message);
      const { episodeId, partSize, partCount } = start;

      const loaded = new Map<number, number>();
      const report = () => setPhase({ name: "uploading", file, episodeId, sent: [...loaded.values()].reduce((a, b) => a + b, 0) });
      report();

      const parts: { PartNumber: number; ETag: string }[] = [];
      const urls = new Map<number, string>();
      const queue = Array.from({ length: partCount }, (_, i) => i + 1);

      const urlFor = async (n: number) => {
        if (!urls.has(n)) {
          const batch = queue.filter((p) => !urls.has(p)).slice(0, 20);
          if (!batch.includes(n)) batch.unshift(n);
          const signed = await signEpisodeParts(episodeId, batch);
          if (!signed.ok) throw new Error("sign");
          for (const [k, v] of Object.entries(signed.urls)) urls.set(Number(k), v);
        }
        return urls.get(n)!;
      };

      const worker = async () => {
        while (queue.length && !cancelled.current) {
          const n = queue.shift()!;
          const blob = file.slice((n - 1) * partSize, Math.min(n * partSize, file.size));
          for (let attempt = 1; ; attempt++) {
            try {
              const etag = await putPart(await urlFor(n), blob, (b) => {
                loaded.set(n, b);
                report();
              }, xhrs.current);
              parts.push({ PartNumber: n, ETag: etag });
              loaded.set(n, blob.size);
              report();
              break;
            } catch (e) {
              if (cancelled.current) return;
              loaded.set(n, 0);
              if (attempt >= MAX_TRIES) throw e;
              // A signed link can expire on very long uploads: get a fresh one before retrying.
              urls.delete(n);
              await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
            }
          }
        }
      };

      try {
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, partCount) }, worker));
      } catch (e) {
        console.error(e);
        await cancelEpisodeUpload(episodeId);
        setPhase({ name: "idle" });
        setError("The upload kept failing. Check your internet connection and try again.");
        return;
      }
      if (cancelled.current) return;

      setPhase({ name: "finishing", file });
      const done = await finishEpisodeUpload(episodeId, parts);
      if (!done.ok) {
        setPhase({ name: "idle" });
        return setError(done.message);
      }
      router.push(`/app/shows/${showId}/episodes/${episodeId}?uploaded=1`);
    },
    [allowVideo, router, showId],
  );

  const cancel = async () => {
    if (phase.name !== "uploading") return;
    cancelled.current = true;
    xhrs.current.forEach((x) => x.abort());
    await cancelEpisodeUpload(phase.episodeId);
    setPhase({ name: "idle" });
  };

  if (phase.name !== "idle") {
    const pct = phase.name === "uploading" ? Math.min(100, Math.round((phase.sent / phase.file.size) * 100)) : 100;
    return (
      <Card className="max-w-3xl p-8">
        <div className="mb-5 flex items-center gap-4">
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-canvas text-ink">
            <FileAudio size={22} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{phase.file.name}</p>
            <p className="text-sm text-muted">
              {phase.name === "uploading"
                ? `${formatBytes(phase.sent)} of ${formatBytes(phase.file.size)}`
                : "Upload complete. Starting processing…"}
            </p>
          </div>
          <span className="text-[22px] font-bold tabular-nums">{pct}%</span>
        </div>
        <div
          className="h-3 overflow-hidden rounded-full bg-canvas"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Upload progress"
        >
          <div className="h-full rounded-full bg-ink transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate">Keep this tab open until the upload finishes. Ospod takes it from there.</p>
          {phase.name === "uploading" ? (
            <button type="button" onClick={cancel} className={buttonClass({ variant: "ghost", size: "sm" })}>
              <X size={16} aria-hidden="true" /> Cancel
            </button>
          ) : (
            <Loader2 size={20} className="animate-spin text-muted" aria-label="Finishing" />
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void upload(file);
        }}
        className={clsx(
          "flex cursor-pointer flex-col items-center justify-center rounded-[20px] border-2 border-dashed bg-white px-8 py-16 text-center transition-colors",
          "has-focus-visible:outline-3 has-focus-visible:outline-focus",
          dragging ? "border-ink bg-canvas" : "border-line-strong hover:border-ink",
        )}
      >
        <span className="mb-5 inline-flex size-16 items-center justify-center rounded-2xl bg-ink text-gold">
          <UploadCloud size={30} aria-hidden="true" />
        </span>
        <span className="text-[22px] font-bold tracking-[-0.015em]">Drop your episode here</span>
        <span className="mt-1 text-[16px] text-slate">or click to choose a file</span>
        <span className="mt-4 text-sm text-muted">
          {allowVideo ? "MP3, WAV, M4A, FLAC, MP4 or MOV. Audio up to 2 GB, video up to 25 GB." : "MP3, WAV, M4A or FLAC, up to 2 GB."}
        </span>
        <input
          ref={input}
          type="file"
          className="sr-only"
          accept={allowVideo ? "audio/*,video/mp4,video/quicktime,video/webm,video/x-matroska" : "audio/*"}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
      </label>
      {error && (
        <Notice tone="error" className="mt-5">
          {error}
        </Notice>
      )}
      <ol className="mt-8 grid gap-4 text-[15px] text-slate md:grid-cols-3">
        <li>
          <strong className="block text-ink">1. Upload</strong>Straight to secure storage, in chunks that retry on their own.
        </li>
        <li>
          <strong className="block text-ink">2. Ospod prepares it</strong>Audio is levelled to podcast loudness, then transcribed.
        </li>
        <li>
          <strong className="block text-ink">3. You review</strong>AI drafts the title, show notes and chapters. You approve.
        </li>
      </ol>
    </div>
  );
}
