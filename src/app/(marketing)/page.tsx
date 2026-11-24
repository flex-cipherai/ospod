import Link from "next/link";
import { BarChart3, Clapperboard, Send, Upload, Wand2, MousePointerClick, Mic2, Video, ArrowRight } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { TRIAL_DAYS } from "@/lib/plans";

const destinations = ["Apple Podcasts", "Spotify", "YouTube", "Amazon Music", "iHeartRadio", "Pocket Casts", "Overcast", "Every podcast app"];

const pillars = [
  {
    icon: <Send size={22} />,
    title: "Publish everywhere with one click",
    body: "Upload once. Ospod sends your episode to Apple, Spotify, YouTube and every podcast app, as audio, video or both.",
  },
  {
    icon: <Clapperboard size={22} />,
    title: "Clips and trailers, made for you",
    body: "Ospod finds the moments worth sharing and cuts them into captioned vertical clips and trailers, ready for TikTok, Reels and Shorts.",
  },
  {
    icon: <BarChart3 size={22} />,
    title: "All your numbers, explained",
    body: "Downloads, YouTube views and listener data in one place. Ask in plain words what's working and get a straight answer.",
  },
];

const steps = [
  { icon: <Upload size={20} />, title: "Drop in your episode", body: "Audio or video, straight from your editor or Google Drive." },
  { icon: <Wand2 size={20} />, title: "Ospod does the busywork", body: "Transcript, title, show notes, chapters and clips, drafted for you to approve." },
  { icon: <MousePointerClick size={20} />, title: "Click Publish", body: "It goes live everywhere at once, or on the day you schedule." },
];

const faqs = [
  {
    q: "Do I have to move my podcast to Ospod?",
    a: "Ospod hosts your show, which is what lets it publish everywhere at once and measure your downloads accurately. Moving takes about a minute: we copy your episodes, and your old host points your feed to Ospod. Your listeners, reviews and rankings stay exactly where they are.",
  },
  {
    q: "Does it work for video podcasts?",
    a: "Yes. Ospod is built for audio and video shows. Video episodes go to YouTube, Spotify and Apple Podcasts, and audio goes to every podcast app.",
  },
  {
    q: "How does the free trial work?",
    a: `You get ${TRIAL_DAYS} days with everything unlocked, and you don't need a card to start. You choose a plan when you're ready.`,
  },
  {
    q: "How can I pay?",
    a: "By card or M-Pesa, monthly or yearly. Yearly saves 20%.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="mx-auto grid max-w-[1200px] items-center gap-16 px-10 pt-12 pb-24 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm font-medium">
            <span className="size-2 rounded-full bg-gold" aria-hidden="true" />
            For audio and video podcasters
          </p>
          <h1 className="mb-7 text-[clamp(48px,6.4vw,80px)] leading-[0.98] font-bold tracking-[-0.035em]">
            Record it once. Ospod takes it everywhere.
          </h1>
          <p className="mb-10 max-w-[34em] text-[21px] leading-normal text-slate">
            Publish to every platform with one click, turn each episode into clips and trailers, and see all your
            analytics in one place, with AI that tells you what's working.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/signup" className={buttonClass({ size: "lg" })}>
              Start your free trial <ArrowRight size={20} aria-hidden="true" />
            </Link>
            <Link href="/pricing" className={buttonClass({ variant: "secondary", size: "lg" })}>
              See pricing
            </Link>
          </div>
          <p className="mt-4 text-[15px] text-muted">{TRIAL_DAYS} days free · No card needed</p>
        </div>

        {/* Publish panel illustration */}
        <div className="rounded-[28px] bg-ink p-8 text-white shadow-[0_30px_60px_-30px_rgba(24,33,58,0.6)]" aria-hidden="true">
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-navy-800 p-4">
            <span className="inline-flex size-12 items-center justify-center rounded-xl bg-gold text-ink">
              <Video size={22} />
            </span>
            <div>
              <p className="font-semibold">Ep. 48 · The quiet launch</p>
              <p className="text-sm text-mist">Video · 52 min · ready</p>
            </div>
          </div>
          <ul className="mb-6 space-y-2.5">
            {["Apple Podcasts", "Spotify", "YouTube", "Amazon Music", "+ every podcast app"].map((d) => (
              <li key={d} className="flex items-center justify-between rounded-xl border border-navy-700 px-4 py-3 text-[15px]">
                {d}
                <span className="inline-flex size-5 items-center justify-center rounded-md bg-gold text-[12px] font-bold text-ink">✓</span>
              </li>
            ))}
          </ul>
          <div className="flex min-h-14 items-center justify-center rounded-2xl bg-gold text-lg font-semibold text-ink">
            Publish everywhere
          </div>
        </div>
      </section>

      <section aria-label="Where Ospod publishes" className="border-y border-line bg-white">
        <ul className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-10 gap-y-3 px-10 py-7 text-[15px] font-semibold text-muted">
          {destinations.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </section>

      <section id="features" className="mx-auto max-w-[1200px] scroll-mt-8 px-10 pt-28">
        <h2 className="mb-5 max-w-[16em] text-[clamp(36px,4.4vw,52px)] leading-[1.04] font-bold tracking-[-0.03em]">
          One place to run your whole show
        </h2>
        <p className="max-w-[36em] text-[19px] text-slate">
          Stop juggling a host, a clipping tool, a scheduler and five analytics dashboards.
        </p>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {pillars.map((p) => (
            <article key={p.title} className="rounded-[20px] border border-line bg-white p-8">
              <span className="mb-6 inline-flex size-12 items-center justify-center rounded-xl bg-ink text-gold" aria-hidden="true">
                {p.icon}
              </span>
              <h3 className="mb-3 text-[22px] leading-tight font-bold tracking-[-0.015em]">{p.title}</h3>
              <p className="text-[17px] text-slate">{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-10 pt-28">
        <h2 className="mb-5 text-[clamp(36px,4.4vw,52px)] leading-[1.04] font-bold tracking-[-0.03em]">How it works</h2>
        <ol className="mt-12 grid gap-12 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="border-t-2 border-ink pt-6">
              <span className="mb-5 inline-flex size-9 items-center justify-center rounded-full bg-gold text-[15px] font-bold">
                {i + 1}
              </span>
              <h3 className="mb-2.5 text-2xl leading-tight font-bold tracking-[-0.015em]">{s.title}</h3>
              <p className="text-[17px] text-slate">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-[1200px] px-10 pt-28">
        <div className="on-dark grid items-center gap-12 rounded-[28px] bg-ink p-12 text-white md:grid-cols-2 md:p-16">
          <div>
            <h2 className="mb-5 text-[clamp(36px,4.4vw,52px)] leading-[1.02] font-bold tracking-[-0.03em]">
              Built for audio and video shows alike
            </h2>
            <p className="text-[19px] text-[#DCE1EC]">
              Whether you record a microphone or a three-camera studio, Ospod sends the right file to the right place.
            </p>
          </div>
          <ul className="grid gap-4">
            <li className="flex gap-4 rounded-2xl bg-navy-800 p-5">
              <Mic2 className="mt-0.5 shrink-0 text-gold" size={22} aria-hidden="true" />
              <p><strong className="block">Audio</strong><span className="text-mist">Apple, Spotify, Amazon and every podcast app, loudness-matched.</span></p>
            </li>
            <li className="flex gap-4 rounded-2xl bg-navy-800 p-5">
              <Video className="mt-0.5 shrink-0 text-gold" size={22} aria-hidden="true" />
              <p><strong className="block">Video</strong><span className="text-mist">YouTube, Spotify video and Apple Podcasts video, plus vertical clips.</span></p>
            </li>
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-10 pt-28">
        <h2 className="mb-5 text-[clamp(36px,4.4vw,52px)] leading-[1.04] font-bold tracking-[-0.03em]">Questions</h2>
        <div className="mt-12 max-w-[820px]">
          {faqs.map((f) => (
            <details key={f.q} className="group border-t-[1.5px] border-line-strong py-1 last:border-b-[1.5px]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[21px] font-semibold [&::-webkit-details-marker]:hidden">
                {f.q}
                <span aria-hidden="true" className="text-2xl font-normal group-open:hidden">+</span>
                <span aria-hidden="true" className="hidden text-2xl font-normal group-open:inline">−</span>
              </summary>
              <p className="mb-6 max-w-[40em] text-[17px] text-slate">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-10 pt-28 text-center">
        <h2 className="mx-auto mb-6 max-w-[14em] text-[clamp(36px,4.4vw,52px)] leading-[1.04] font-bold tracking-[-0.03em]">
          Spend your time on the show, not the busywork
        </h2>
        <Link href="/signup" className={buttonClass({ variant: "gold", size: "lg" })}>
          Start your free trial
        </Link>
      </section>
    </>
  );
}
