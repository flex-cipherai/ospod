import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/app-shell";
import { Badge, Card, Notice, Skeleton } from "@/components/ui";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatUsd, monthlyRevenue, planById, type PlanId } from "@/lib/plans";

export const metadata: Metadata = { title: "Workspaces" };

type Row = {
  id: string;
  name: string;
  plan: PlanId;
  plan_status: "trialing" | "active" | "past_due" | "canceled";
  billing_interval: "month" | "year";
  trial_ends_at: string | null;
  founding_member: boolean;
  created_at: string;
  owner: { email: string; full_name: string | null } | null;
  shows: { count: number }[];
  workspace_members: { count: number }[];
};

const statusTone = { trialing: "gold", active: "success", past_due: "danger", canceled: "neutral" } as const;
const statusLabel = { trialing: "Trial", active: "Active", past_due: "Payment due", canceled: "Cancelled" } as const;
const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function AdminWorkspacesPage() {
  return (
    <>
      <PageHeader title="Workspaces" description="Every workspace, its plan and its size. The newest 200 are shown." />
      <Suspense fallback={<Skeleton className="h-[480px] rounded-[20px]" />}>
        <WorkspacesTable />
      </Suspense>
    </>
  );
}

async function WorkspacesTable() {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select(
      "id, name, plan, plan_status, billing_interval, trial_ends_at, founding_member, created_at, owner:profiles!workspaces_owner_id_fkey(email, full_name), shows(count), workspace_members(count)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return <Notice tone="error">We couldn't load workspaces. {error.message}</Notice>;
  const rows = (data ?? []) as unknown as Row[];

  if (rows.length === 0) {
    return (
      <Card className="px-8 py-16 text-center text-slate">No workspaces yet.</Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[15px]">
          <thead className="border-b border-line bg-canvas/60 text-sm text-muted">
            <tr>
              <th scope="col" className="px-6 py-3 font-semibold">Workspace</th>
              <th scope="col" className="px-4 py-3 font-semibold">Plan</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Members</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Shows</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">MRR</th>
              <th scope="col" className="px-6 py-3 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const paying = r.plan_status === "active" || r.plan_status === "past_due";
              return (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-6 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{r.name}</span>
                      {r.founding_member && <Badge tone="ink">Founding</Badge>}
                    </div>
                    <span className="text-sm text-muted">{r.owner?.email}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{planById(r.plan)?.name}</span>
                      <Badge tone={statusTone[r.plan_status]}>{statusLabel[r.plan_status]}</Badge>
                    </div>
                    {r.plan_status === "trialing" && <span className="text-sm text-muted">Trial ends {date(r.trial_ends_at)}</span>}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums">{r.workspace_members[0]?.count ?? 0}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums">{r.shows[0]?.count ?? 0}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums">
                    {paying ? formatUsd(monthlyRevenue(r.plan, r.billing_interval, r.founding_member)) : "—"}
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-slate">{date(r.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
