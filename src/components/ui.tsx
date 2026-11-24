import { clsx } from "clsx";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "gold" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

/** Button styles, usable on <button>, <Link> and <a>. */
export function buttonClass({
  variant = "primary",
  size = "md",
  full = false,
  className,
}: { variant?: Variant; size?: Size; full?: boolean; className?: string } = {}) {
  return clsx(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-55",
    {
      sm: "min-h-9 px-3.5 text-sm",
      md: "min-h-11 px-5 text-[15px]",
      lg: "min-h-14 px-7 text-lg rounded-2xl",
    }[size],
    {
      primary: "bg-ink text-white hover:bg-ink-hover",
      gold: "bg-gold text-ink hover:bg-gold-hover",
      secondary: "border-[1.5px] border-line-strong bg-white text-ink hover:border-ink",
      ghost: "text-ink hover:bg-ink/5",
      danger: "bg-danger text-white hover:bg-danger/90",
    }[variant],
    full && "w-full",
    className,
  );
}

export function Card({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={clsx("rounded-[var(--radius-card)] border border-line bg-white", className)} {...rest}>
      {children}
    </div>
  );
}

export function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-[15px] font-semibold">
      {children}
    </label>
  );
}

export const inputClass = clsx(
  "h-12 w-full rounded-xl border-[1.5px] border-line-strong bg-white px-4 text-base text-ink",
  "placeholder:text-subtle hover:border-muted focus:border-ink focus:outline-none focus-visible:outline-3 focus-visible:outline-focus",
  "disabled:bg-canvas disabled:text-muted",
);

export function Field({
  id,
  label,
  hint,
  error,
  ...input
}: { id: string; label: string; hint?: ReactNode; error?: string } & ComponentProps<"input">) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        name={id}
        className={clsx(inputClass, error && "border-danger")}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...input}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Notice({
  tone = "info",
  children,
  className,
}: {
  tone?: "info" | "success" | "error" | "gold";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={clsx(
        "rounded-xl px-4 py-3 text-[15px] leading-snug",
        {
          info: "bg-periwinkle-soft text-ink",
          success: "bg-success-soft text-success",
          error: "bg-danger-soft text-danger",
          gold: "bg-gold-soft text-gold-ink",
        }[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "gold" | "success" | "danger" | "ink";
  children: ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        {
          neutral: "bg-canvas text-slate",
          gold: "bg-gold-soft text-gold-ink",
          success: "bg-success-soft text-success",
          danger: "bg-danger-soft text-danger",
          ink: "bg-ink text-white",
        }[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-lg bg-line/70", className)} aria-hidden="true" />;
}
