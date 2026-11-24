import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card, Notice, Skeleton } from "@/components/ui";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PLANS, formatNumber, formatUsd, monthlyRevenue, type PlanId } from "@/lib/plans";
import { SignupsChart } from "./signups-chart";

export const metadata: Metadata = { title: "Overview" };

type Overview = {
  users_total: number;
  users_new_7d: number;
  users_new_30d: number;
  users_active_7d: number;
  workspaces_total: number;
  shows_total: number;
  episodes_total: number;
  episodes_published_30d: number;
  subscriptions: { plan: PlanId; status: "trialing" | "active" | "past_due" | "canceled"; interval: "month" | "year"; founding: boolean; count: number }[];
  signups_by_day: { day: string; count: number }[];
};

export default function AdminOverviewPage() {
  return (
    <>
      <PageHeader title="Platform overview" description="How Ospod is doing, across every workspace." />
      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewContent />
      </Suspense>
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-6">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 text-[32px] leading-none font-bold tracking-[-0.02em] tabular-nums">{value}</p>
      {sub && <p className="mt-2 text-sm text-slate">{sub}</p>}
    </Card>
  );
}

async function OverviewContent() {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_overview");
  if (error || !data) {
    return <Notice tone="error">We couldn't load the platform numbers. {error?.message}</Notice>;
  }
  const o = data as Overview;

  const paying = o.subscriptions.filter((s) => s.status === "active" || s.status === "past_due");
  const payingCount = paying.reduce((n, s) => n + s.count, 0);
  const trialCount = o.subscriptions.filter((s) => s.status === "trialing").reduce((n, s) => n + s.count, 0);
  const mrr = paying.reduce((sum, s) => sum + s.count * monthlyRevenue(s.plan, s.interval, s.founding), 0);

  const byPlan = PLANS.map((plan) => {
    const rows = o.subscriptions.filter((s) => s.plan === plan.id);
    const count = (status: Overview["subscriptions"][number]["status"]) =>
      rows.filter((r) => r.status === status).reduce((n, r) => n + r.count, 0);
    const planMrr = rows
      .filter((r) => r.status === "active" || r.status === "past_due")
      .reduce((sum, r) => sum + r.count * monthlyRevenue(r.plan, r.interval, r.founding), 0);
    return { plan, trialing: count("trialing"), active: count("active"), pastDue: count("past_due"), canceled: count("canceled"), mrr: planMrr };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Monthly recurring revenue" value={formatUsd(mrr)} sub={`${formatNumber(payingCount)} paying workspaces`} />
        <Stat label="Users" value={formatNumber(o.users_total)} sub={`+${formatNumber(o.users_new_7d)} this week`} />
        <Stat label="Active in the last 7 days" value={formatNumber(o.users_active_7d)} sub="Signed in at least once" />
        <Stat label="On a free trial" value={formatNumber(trialCount)} sub={`of ${formatNumber(o.workspaces_total)} workspaces`} />
        <Stat label="Shows" value={formatNumber(o.shows_total)} />
        <Stat label="Episodes" value={formatNumber(o.episodes_total)} sub={`${formatNumber(o.episodes_published_30d)} published in 30 days`} />
        <Stat label="New users, 30 days" value={formatNumber(o.users_new_30d)} />
      </div>

      <Card className="p-8 pl-12">
        <h2 className="mb-1 text-[20px] font-bold tracking-[-0.015em]">Sign-ups per day</h2>
        <p className="mb-6 text-sm text-muted">Last 30 days · {formatNumber(o.users_new_30d)} total</p>
        <SignupsChart data={o.signups_by_day} />
      </Card>

      <Card className="overflow-hidden">
        <div className="px-8 pt-7 pb-4">
          <h2 className="text-[20px] font-bold tracking-[-0.015em]">Workspaces by plan</h2>
          <p className="mt-1 text-sm text-muted">Revenue counts active and payment-due workspaces, after yearly and founding-member discounts.</p>
        </div>
        <table className="w-full text-left text-[15px]">
          <thead className="border-y border-line bg-canvas/60 text-sm text-muted">
            <tr>
              <th scope="col" className="px-8 py-3 font-semibold">Plan</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Trial</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Active</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Payment due</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Cancelled</th>
              <th scope="col" className="px-8 py-3 text-right font-semibold">MRR</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {byPlan.map((r) => (
              <tr key={r.plan.id} className="border-b border-line last:border-0">
                <th scope="row" className="px-8 py-3.5 font-semibold">{r.plan.name}</th>
                <td className="px-4 py-3.5 text-right">{r.trialing}</td>
                <td className="px-4 py-3.5 text-right">{r.active}</td>
                <td className="px-4 py-3.5 text-right">{r.pastDue}</td>
                <td className="px-4 py-3.5 text-right">{r.canceled}</td>
                <td className="px-8 py-3.5 text-right font-semibold">{formatUsd(r.mrr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Notice tone="info">
        Downloads, publishing jobs, AI usage and processing costs appear here as those parts of Ospod are built.
      </Notice>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading platform numbers">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-[20px]" />
        ))}
      </div>
      <Skeleton className="h-[320px] rounded-[20px]" />
    </div>
  );
}
