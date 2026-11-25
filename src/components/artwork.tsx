import { clsx } from "clsx";
import { Mic2 } from "lucide-react";

/** Square cover art, with a branded placeholder when there's none yet. */
export function Artwork({ src, alt, size = 64, className }: { src: string | null; alt: string; size?: number; className?: string }) {
  const radius = size >= 120 ? "rounded-2xl" : "rounded-xl";
  if (!src) {
    return (
      <span
        className={clsx("inline-flex shrink-0 items-center justify-center bg-ink text-gold", radius, className)}
        style={{ width: size, height: size }}
        role="img"
        aria-label={alt}
      >
        <Mic2 size={Math.round(size * 0.4)} aria-hidden="true" />
      </span>
    );
  }
  return (
    // Cover art comes from many hosts, so a plain <img> (lazy, sized) is simpler than next/image here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={clsx("shrink-0 bg-line object-cover", radius, className)}
      style={{ width: size, height: size }}
    />
  );
}
