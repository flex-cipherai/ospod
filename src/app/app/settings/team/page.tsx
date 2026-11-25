import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Badge, Card, Skeleton, buttonClass } from "@/components/ui";
import { getProfile, requireWorkspace, roleAtLeast } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/podcast-meta";
import { leaveWorkspace } from "../../workspace-actions";
import { changeRole, removeMember, revokeInvite } from "./actions";
import { ROLE_HELP } from "@/lib/roles";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "Team" };

type Member = {
  user_id: string;
  role: "owner" | "admin" | "editor" | "viewer";
  created_at: string;
  profiles: { full_name: string | null; email: string } | null;
};
type Invite = { id: string; email: string | null; role: "admin" | "editor" | "viewer"; expires_at: string };

const roleLabel = { owner: "Owner", admin: "Admin", editor: "Editor", viewer: "Viewer" } as const;

export default function TeamPage() {
  return (
    <>
      <Link href="/app/settings" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" /> Settings
      </Link>
      <PageHeader title="Team" description="Everyone in this workspace. Every plan includes unlimited team members." />
      <Suspense fallback={<Skeleton className="h-96 rounded-[20px]" />}>
        <Team />
      </Suspense>
    </>
  );
}

async function Team() {
  const [workspace, me] = await Promise.all([requireWorkspace(), getProfile()]);
  const isAdmin = roleAtLeast(workspace.role, "admin");
  const supabase = await createClient();

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("user_id, role, created_at, profiles(full_name, email)")
      .eq("workspace_id", workspace.id)
      .order("created_at")
      .returns<Member[]>(),
    isAdmin
      ? supabase
          .from("workspace_invites")
          .select("id, email, role, expires_at")
          .eq("workspace_id", workspace.id)
          .is("accepted_at", null)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .returns<Invite[]>()
      : Promise.resolve({ data: [] as Invite[] }),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      {isAdmin && (
        <Card className="p-8">
          <h2 className="mb-1 text-[20px] font-bold tracking-[-0.015em]">Invite someone</h2>
          <p className="mb-5 text-[15px] text-slate">Create a link and send it to them however you like: WhatsApp, email or Slack.</p>
          <InviteForm />
        </Card>
      )}

      <Card className="overflow-hidden">
        <h2 className="px-8 pt-7 pb-4 text-[20px] font-bold tracking-[-0.015em]">
          Members <span className="font-medium text-muted">({members?.length ?? 0})</span>
        </h2>
        <ul className="divide-y divide-line border-t border-line">
          {(members ?? []).map((m) => {
            const isMe = m.user_id === me?.id;
            const editable = isAdmin && m.role !== "owner" && !isMe;
            return (
              <li key={m.user_id} className="flex flex-wrap items-center gap-4 px-8 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {m.profiles?.full_name || m.profiles?.email}
                    {isMe && <span className="ml-2 text-sm font-normal text-muted">(you)</span>}
                  </p>
                  <p className="truncate text-sm text-muted">{m.profiles?.email}</p>
                </div>
                {editable ? (
                  <>
                    <form action={changeRole.bind(null, m.user_id)} className="flex items-center gap-2">
                      <label htmlFor={`role-${m.user_id}`} className="sr-only">
                        Role for {m.profiles?.email}
                      </label>
                      <select
                        id={`role-${m.user_id}`}
                        name="role"
                        defaultValue={m.role}
                        className="h-10 rounded-lg border-[1.5px] border-line-strong bg-white px-3 text-sm"
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button type="submit" className={buttonClass({ variant: "secondary", size: "sm" })}>
                        Save
                      </button>
                    </form>
                    <form action={removeMember.bind(null, m.user_id)}>
                      <button type="submit" className={buttonClass({ variant: "ghost", size: "sm", className: "text-danger" })}>
                        Remove
                      </button>
                    </form>
                  </>
                ) : (
                  <Badge tone={m.role === "owner" ? "ink" : "neutral"}>{roleLabel[m.role]}</Badge>
                )}
                {isMe && m.role !== "owner" && (
                  <form action={leaveWorkspace.bind(null, workspace.id)}>
                    <button type="submit" className={buttonClass({ variant: "ghost", size: "sm", className: "text-danger" })}>
                      Leave workspace
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      {isAdmin && (invites?.length ?? 0) > 0 && (
        <Card className="overflow-hidden">
          <h2 className="px-8 pt-7 pb-4 text-[20px] font-bold tracking-[-0.015em]">Invites waiting</h2>
          <ul className="divide-y divide-line border-t border-line">
            {(invites ?? []).map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-4 px-8 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{i.email ?? "Invite link"}</p>
                  <p className="text-sm text-muted">
                    {roleLabel[i.role]} · expires {formatDate(i.expires_at)}
                  </p>
                </div>
                <form action={revokeInvite.bind(null, i.id)}>
                  <button type="submit" className={buttonClass({ variant: "ghost", size: "sm", className: "text-danger" })}>
                    Cancel invite
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-8">
        <h2 className="mb-4 text-[20px] font-bold tracking-[-0.015em]">What each role can do</h2>
        <dl className="grid gap-4 md:grid-cols-4">
          <div>
            <dt className="font-semibold">Owner</dt>
            <dd className="text-sm text-slate">Everything, plus billing. One per workspace.</dd>
          </div>
          {(Object.keys(ROLE_HELP) as (keyof typeof ROLE_HELP)[]).map((r) => (
            <div key={r}>
              <dt className="font-semibold">{roleLabel[r]}</dt>
              <dd className="text-sm text-slate">{ROLE_HELP[r]}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
