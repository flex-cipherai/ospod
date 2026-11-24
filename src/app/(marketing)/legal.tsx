import type { ReactNode } from "react";
import { contactEmail } from "@/lib/env";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-[760px] px-10 pt-12 text-[17px] leading-relaxed text-slate [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-ink [&_p]:mb-4">
      <h1 className="mb-4 text-[clamp(40px,5vw,56px)] leading-[1.02] font-bold tracking-[-0.03em] text-ink">{title}</h1>
      <p className="rounded-xl bg-gold-soft px-4 py-3 text-[15px] text-gold-ink">
        This is a summary while Ospod is in early access. The full version will be published before launch.
      </p>
      {children}
      <h2>Contact</h2>
      <p>
        Questions? Email <a className="font-semibold text-ink underline" href={`mailto:${contactEmail}`}>{contactEmail}</a>.
      </p>
    </article>
  );
}
