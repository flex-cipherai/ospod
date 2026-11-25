import Link from "next/link";
import { Download, Sparkles } from "lucide-react";
import { buttonClass } from "@/components/ui";

export function AddShowChoices() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Link
        href="/app/shows/import"
        className="group flex flex-col rounded-[20px] border-2 border-ink bg-white p-8 transition-shadow hover:shadow-[0_16px_40px_-24px_rgba(24,33,58,0.5)]"
      >
        <span className="mb-6 inline-flex size-12 items-center justify-center rounded-xl bg-ink text-gold">
          <Download size={22} aria-hidden="true" />
        </span>
        <span className="mb-1 text-xs font-bold tracking-wide text-gold-ink uppercase">Most podcasters start here</span>
        <h2 className="mb-2 text-[22px] font-bold tracking-[-0.015em]">I already have a podcast</h2>
        <p className="mb-6 flex-1 text-[16px] text-slate">
          Find your show by name and we'll bring in every episode, your artwork and details in about a minute. Nothing
          changes for your listeners.
        </p>
        <span className={buttonClass({ className: "self-start" })}>Import my show</span>
      </Link>

      <Link
        href="/app/shows/create"
        className="group flex flex-col rounded-[20px] border border-line bg-white p-8 transition-colors hover:border-ink"
      >
        <span className="mb-6 inline-flex size-12 items-center justify-center rounded-xl bg-gold text-ink">
          <Sparkles size={22} aria-hidden="true" />
        </span>
        <span className="mb-1 text-xs font-bold tracking-wide text-muted uppercase">Brand new</span>
        <h2 className="mb-2 text-[22px] font-bold tracking-[-0.015em]">I'm starting a new podcast</h2>
        <p className="mb-6 flex-1 text-[16px] text-slate">
          Name your show, add cover art and pick a category. You can publish your first episode when you're ready.
        </p>
        <span className={buttonClass({ variant: "secondary", className: "self-start" })}>Start a new show</span>
      </Link>
    </div>
  );
}
