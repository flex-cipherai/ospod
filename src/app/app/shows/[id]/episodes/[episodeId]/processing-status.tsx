"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { clsx } from "clsx";

const STEPS = [
  { stage: "queued", label: "Upload received" },
  { stage: "preparing", label: "Preparing audio", hint: "Levelling loudness for podcast apps" },
  { stage: "transcribing", label: "Transcribing", hint: "Turning speech into text, with speakers" },
  { stage: "writing", label: "Writing", hint: "Drafting titles, show notes and chapters" },
  { stage: "ready", label: "Ready for you to review" },
] as const;

/** Live progress while an episode processes. Refreshes the page every few seconds until it's done. */
export function ProcessingStatus({ stage }: { stage: string }) {
  const router = useRouter();
  const current = STEPS.findIndex((s) => s.stage === stage);

  useEffect(() => {
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [router]);

  return (
    <div>
      <ol className="space-y-3" aria-live="polite">
        {STEPS.map((step, i) => {
          const done = i < current || (i === current && step.stage === "queued");
          const active = i === current && !done;
          return (
            <li key={step.stage} className="flex items-center gap-4">
              <span
                className={clsx(
                  "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  done ? "bg-success text-white" : active ? "bg-gold text-ink" : "bg-canvas text-subtle",
                )}
                aria-hidden="true"
              >
                {done ? <Check size={18} strokeWidth={3} /> : active ? <Loader2 size={18} className="animate-spin" /> : i + 1}
              </span>
              <div>
                <p className={clsx("font-semibold", !done && !active && "text-subtle")}>
                  {step.label}
                  {done && <span className="sr-only"> (done)</span>}
                  {active && <span className="sr-only"> (in progress)</span>}
                </p>
                {active && "hint" in step && <p className="text-sm text-muted">{step.hint}…</p>}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-6 text-sm text-muted">
        Usually a few minutes for an hour-long episode. You can leave this page; it carries on without you.
      </p>
    </div>
  );
}
