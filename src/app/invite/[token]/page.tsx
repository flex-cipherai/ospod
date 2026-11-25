import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { OspodLogo } from "@/components/logo";
import { Card, Notice, Skeleton, buttonClass } from "@/components/ui";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hashInviteToken, rememberWorkspace } from "@/lib/workspace-session";

export const metadata: Metadata = { title: "You're invited", robots: { index: false } };

const roleLabel = { owner: "owner", admin: "an admin", editor: "an editor", viewer: "a viewer" } as const;

async function acceptInvite(token: string) {
  "use server";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invite", { p_token_hash: hashInviteToken(token) });
  if (error || !data) redirect(`/invite/${encodeURIComponent(token)}?error=1`);
  await rememberWorkspace(data as string);
  redirect("/app?joined=1");
}

export default function InvitePage({ params, searchParams }: PageProps<"/invite/[token]">) {
  return (
    <div className="flex min-h-dvh flex-col px-6 py-8 sm:px-12">
      <OspodLogo />
      <main className="flex flex-1 items-center justify-center py-12">
        <Card className="w-full max-w-[480px] p-10">
          <Suspense fallback={<Skeleton className="h-56" />}>
            <Invite params={params} searchParams={searchParams} />
          </Suspense>
        </Card>
      </main>
    </div>
  );
}

async function Invite({
  params,
  searchParams,
}: {
  params: PageProps<"/invite/[token]">["params"];
  searchParams: PageProps<"/invite/[token]">["searchParams"];
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const [{ data }, profile] = await Promise.all([
    supabase.rpc("invite_preview", { p_token_hash: hashInviteToken(token) }),
    getProfile(),
  ]);
  const invite = (data as { workspace_name: string; role: keyof typeof roleLabel; invited_by_name: string | null; valid: boolean }[] | null)?.[0];

  if (!invite || !invite.valid || query.error) {
    return (
      <>
        <h1 className="mb-3 text-[28px] leading-tight font-bold tracking-[-0.02em]">This invite link doesn't work</h1>
        <p className="mb-6 text-[17px] text-slate">It may have expired or already been used. Ask the person who sent it for a new one.</p>
        <Link href={profile ? "/app" : "/"} className={buttonClass()}>
          {profile ? "Go to my dashboard" : "Go to Ospod"}
        </Link>
      </>
    );
  }

  const next = `/invite/${encodeURIComponent(token)}`;
  return (
    <>
      <span className="mb-6 inline-flex size-14 items-center justify-center rounded-2xl bg-gold-soft text-gold-ink">
        <Users size={28} aria-hidden="true" />
      </span>
      <h1 className="mb-3 text-[28px] leading-tight font-bold tracking-[-0.02em]">Join {invite.workspace_name} on Ospod</h1>
      <p className="mb-8 text-[17px] text-slate">
        {invite.invited_by_name ?? "Someone"} invited you to join as {roleLabel[invite.role]}.
      </p>
      {profile ? (
        <>
          <form action={acceptInvite.bind(null, token)}>
            <button type="submit" className={buttonClass({ size: "lg", full: true })}>
              Join {invite.workspace_name}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-muted">Signed in as {profile.email}</p>
        </>
      ) : (
        <div className="space-y-3">
          <Link href={`/signup?next=${encodeURIComponent(next)}`} className={buttonClass({ size: "lg", full: true })}>
            Create an account to join
          </Link>
          <Link href={`/login?next=${encodeURIComponent(next)}`} className={buttonClass({ variant: "secondary", size: "lg", full: true })}>
            I already have an account
          </Link>
          <Notice tone="info" className="mt-4">Accounts are free. You'll join this team's workspace as soon as you sign in.</Notice>
        </div>
      )}
    </>
  );
}
