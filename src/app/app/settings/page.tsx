import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/app-shell";
import { Badge, Card, Skeleton } from "@/components/ui";
import { getWorkspace, requireProfile } from "@/lib/auth";
import { planById } from "@/lib/plans";
import { ProfileForm, WorkspaceForm } from "./forms";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Your account and workspace." />
      <Suspense fallback={<Skeleton className="h-96 rounded-[20px]" />}>
        <Settings />
      </Suspense>
    </>
  );
}

const statusLabel = { trialing: "Free trial", active: "Active", past_due: "Payment due", canceled: "Cancelled" } as const;

async function Settings() {
  const profile = await requireProfile();
  const workspace = await getWorkspace();
  const plan = workspace ? planById(workspace.plan) : undefined;

  return (
    <div className="grid max-w-3xl gap-6">
      <Card className="p-8">
        <h2 className="mb-6 text-[22px] font-bold tracking-[-0.015em]">Profile</h2>
        <ProfileForm fullName={profile.full_name ?? ""} email={profile.email} />
      </Card>

      {workspace && (
        <Card className="p-8">
          <h2 className="mb-6 text-[22px] font-bold tracking-[-0.015em]">Workspace</h2>
          <WorkspaceForm name={workspace.name} canEdit={workspace.role === "owner" || workspace.role === "admin"} />
        </Card>
      )}

      {workspace && (
        <Card className="p-8">
          <h2 className="mb-2 text-[22px] font-bold tracking-[-0.015em]">Plan</h2>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[17px]">
              <strong>{plan?.name}</strong>
            </p>
            <Badge tone={workspace.plan_status === "active" ? "success" : workspace.plan_status === "trialing" ? "gold" : "danger"}>
              {statusLabel[workspace.plan_status]}
            </Badge>
            {workspace.founding_member && <Badge tone="ink">Founding member · 50% off for life</Badge>}
          </div>
          <p className="mt-3 text-[15px] text-slate">Billing with card and M-Pesa is coming soon.</p>
        </Card>
      )}
    </div>
  );
}
