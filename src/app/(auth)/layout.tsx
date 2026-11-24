import { Check } from "lucide-react";
import { OspodLogo } from "@/components/logo";

const points = [
  "Publish to Apple, Spotify, YouTube and every podcast app in one click",
  "Turn each episode into clips and trailers for social",
  "See all your analytics in one place, and ask AI what's working",
];

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <OspodLogo />
        <main className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[420px]">{children}</div>
        </main>
      </div>

      <aside className="on-dark relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-end">
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 size-[420px] rounded-full border-[56px] border-white/[0.06]"
        />
        <div aria-hidden="true" className="absolute top-0 right-[160px] h-[340px] w-14 rounded-b-full bg-gold/90" />
        <div className="relative max-w-md">
          <p className="mb-6 text-sm font-semibold tracking-wide text-gold uppercase">The podcast operations hub</p>
          <h2 className="mb-8 text-[40px] leading-[1.05] font-bold tracking-[-0.03em]">
            Record it once. Ospod takes it everywhere.
          </h2>
          <ul className="space-y-4">
            {points.map((p) => (
              <li key={p} className="flex gap-3 text-[17px] text-[#DCE1EC]">
                <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-gold text-ink">
                  <Check size={14} strokeWidth={3} aria-hidden="true" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
