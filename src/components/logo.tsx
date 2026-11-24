import Link from "next/link";
import { clsx } from "clsx";

/** The Ospod mark: a ring cut by a gold bar. Drawn inline so it stays crisp at every size. */
export function OspodMark({ size = 32, onDark = false, className }: { size?: number; onDark?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 30 30"
      width={size}
      height={size}
      aria-hidden="true"
      className={clsx("shrink-0", className)}
    >
      <rect width="30" height="30" rx="8" fill={onDark ? "#FFFFFF" : "#18213A"} />
      <circle cx="15" cy="15" r="7.5" fill="none" stroke={onDark ? "#18213A" : "#FFFFFF"} strokeWidth="2.5" />
      <rect x="13.75" y="4" width="2.5" height="22" rx="1.25" fill="#FFC23D" />
    </svg>
  );
}

export function OspodLogo({
  href = "/",
  onDark = false,
  size = 32,
  className,
}: {
  href?: string;
  onDark?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex items-center gap-2.5 rounded-lg font-bold tracking-[-0.03em]",
        onDark ? "text-white" : "text-ink",
        className,
      )}
      style={{ fontSize: size * 0.78 }}
      aria-label="Ospod home"
    >
      <OspodMark size={size} onDark={onDark} />
      <span>ospod</span>
    </Link>
  );
}
