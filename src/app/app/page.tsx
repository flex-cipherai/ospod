import { Suspense } from "react";
import Link from "next/link";
import { Check, Mic2, Send, MonitorPlay, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { Card, Skeleton, buttonClass } from "@/components/ui";
import { firstName, requireProfile, getWorkspace } from "@/lib/auth";
import { planById } from "@/lib/plans";

export default function DashboardHome() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Home />
    </Suspense>
  );
}

function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

type Step = { title: string; body: string; icon: React.ReactNode; done?: boolean; available?: boolean; href?: string; cta?: string };

async function Home() {
  const profile = await requireProfile();
  const workspace = await getWorkspace();
  const plan = workspace ? planById(workspace.plan) : undefined;
  const trialDays = workspace?.plan_status === "trialing" ? daysLeft(workspace.trial_ends_at) : null;

  const steps: Step[] = [
    { title: "Create your account", body: "You're in. Welcome to Ospod.", icon: <Check size={18} />, done: true },
    {
      title: "Add your show",
      body: "Import it from your current host in about a minute, or start a new one. Nothing changes for your listeners.",
      icon: <Mic2 size={18} />,
    },
    {
      title: "Connect YouTube",
      body: "So video episodes go up to your channel when you publish.",
      icon: <MonitorPlay size={18} />,
    },
    {
      title: "Publish your first episode",
      body: "Drop in the file. Ospod writes the title, show notes and chapters, and you click Publish.",
      icon: <Send size={18} />,
    },
  ];

  return (
    <>
      <header className="mb-8">
        <h1 className="text-[34px] leading-tight font-bold tracking-[-0.025em]">Welcome, {firstName(profile)}</h1>
        <p className="mt-1.5 text-[17px] text-slate">Let's get your show set up. It takes a few minutes.</p>
      </header>

      {trialDays !== null && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border-l-[6px] border-gold bg-white px-6 py-4">
          <p className="text-[15px]">
            <strong className="font-semibold">
              {trialDays === 0 ? "Your free trial ends today." : `${trialDays} ${trialDays === 1 ? "day" : "days"} left in your free trial`}
            </strong>{" "}
            <span className="text-slate">on the {plan?.name ?? "Starter"} plan. Everything is unlocked while you try it.</span>
          </p>
          <Link href="/pricing" className={buttonClass({ variant: "secondary", size: "sm" })}>
            See plans
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="p-8">
          <h2 className="mb-1 text-[22px] font-bold tracking-[-0.015em]">Get set up</h2>
          <p className="mb-6 text-[15px] text-muted">
            {steps.filter((s) => s.done).length} of {steps.length} done
          </p>
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li
                key={step.title}
                className={clsx(
                  "flex gap-4 rounded-2xl border p-5",
                  step.done ? "border-transparent bg-success-soft/60" : "border-line",
                )}
              >
                <span
                  className={clsx(
                    "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    step.done ? "bg-success text-white" : "bg-canvas text-ink",
                  )}
                  aria-hidden="true"
                >
                  {step.done ? <Check size={18} strokeWidth={3} /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className={clsx("text-[17px] font-semibold", step.done && "text-success")}>
                    {step.title}
                    {step.done && <span className="sr-only"> (done)</span>}
                  </h3>
                  <p className="mt-0.5 text-[15px] text-slate">{step.body}</p>
                </div>
                {!step.done && (
                  <span className="self-center rounded-full bg-canvas px-3 py-1 text-xs font-semibold whitespace-nowrap text-muted">
                    Coming soon
                  </span>
                )}
              </li>
            ))}
          </ol>
        </Card>

        <Card className="on-dark border-0 bg-ink p-8 text-white">
          <span className="mb-5 inline-flex size-11 items-center justify-center rounded-xl bg-gold text-ink">
            <Sparkles size={22} aria-hidden="true" />
          </span>
          <h2 className="mb-2 text-[22px] font-bold tracking-[-0.015em]">What Ospod will do for you</h2>
          <ul className="space-y-3 text-[15px] text-[#DCE1EC]">
            <li>Publish each episode to Apple, Spotify, YouTube and every podcast app with one click.</li>
            <li>Find the best moments and turn them into clips and trailers.</li>
            <li>Bring all your numbers together and tell you, in plain words, what's working.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}

function HomeSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your dashboard">
      <Skeleton className="mb-3 h-10 w-72" />
      <Skeleton className="mb-8 h-6 w-96" />
      <Skeleton className="mb-8 h-16" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Skeleton className="h-[420px] rounded-[20px]" />
        <Skeleton className="h-[300px] rounded-[20px]" />
      </div>
    </div>
  );
}
