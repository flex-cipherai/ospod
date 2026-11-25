"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Loader2 } from "lucide-react";
import { Artwork } from "@/components/artwork";
import { Notice, buttonClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { setShowArtwork } from "./actions";

const MIN = 1400;
const MAX = 3000;

function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      reject(new Error("unreadable"));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/** Checks cover art against what Apple Podcasts accepts, and uploads it straight to storage. */
export function ArtworkUploader({
  workspaceId,
  showId,
  current,
  title,
}: {
  workspaceId: string;
  showId: string;
  current: string | null;
  title: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [preview, setPreview] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handle(file: File) {
    setError(null);
    setDone(false);
    if (!["image/jpeg", "image/png"].includes(file.type)) return setError("Use a JPG or PNG image.");
    if (file.size > 10 * 1024 * 1024) return setError("That image is over 10 MB. Export a smaller JPG.");
    let size;
    try {
      size = await readImageSize(file);
    } catch {
      return setError("We couldn't read that image. Try another file.");
    }
    if (size.width !== size.height) return setError(`Cover art must be square. This one is ${size.width} × ${size.height} pixels.`);
    if (size.width < MIN || size.width > MAX) {
      return setError(`Apple Podcasts needs cover art between ${MIN} and ${MAX} pixels wide. This one is ${size.width} pixels.`);
    }

    setBusy(true);
    const ext = file.type === "image/png" ? "png" : "jpg";
    const path = `${workspaceId}/${showId}/cover-${Date.now()}.${ext}`;
    const { error: uploadError } = await createClient()
      .storage.from("show-artwork")
      .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
    if (uploadError) {
      setBusy(false);
      return setError("The upload didn't finish. Check your connection and try again.");
    }
    const saved = await setShowArtwork(showId, path);
    setBusy(false);
    if (!saved.ok) return setError(saved.message ?? "We couldn't save the cover art.");
    setPreview(URL.createObjectURL(file));
    setDone(true);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-start gap-6">
      <Artwork src={preview} alt={`${title} cover art`} size={160} />
      <div className="max-w-sm flex-1">
        <p className="mb-1 font-semibold">Cover art</p>
        <p className="mb-4 text-sm text-muted">
          Square JPG or PNG, {MIN}–{MAX} pixels wide. This is what people see in every podcast app.
        </p>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png"
          className="sr-only"
          aria-label="Choose cover art"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handle(file);
            e.target.value = "";
          }}
        />
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className={buttonClass({ variant: "secondary" })}>
          {busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <ImageUp size={18} aria-hidden="true" />}
          {busy ? "Uploading…" : preview ? "Replace cover art" : "Upload cover art"}
        </button>
        {error && <Notice tone="error" className="mt-4">{error}</Notice>}
        {done && <Notice tone="success" className="mt-4">Cover art saved.</Notice>}
      </div>
    </div>
  );
}
