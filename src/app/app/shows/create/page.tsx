import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Card, Skeleton } from "@/components/ui";
import { getProfile, requireWorkspace } from "@/lib/auth";
import { FEED_HOST } from "@/lib/env";
import { createShow } from "../actions";
import { ShowForm } from "../show-form";

export const metadata: Metadata = { title: "Start a new show" };

export default function CreateShowPage() {
  return (
    <>
      <Link href="/app/shows/new" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" /> Add a show
      </Link>
      <PageHeader title="Start a new show" description="You can change any of this later. Cover art comes next." />
      <Card className="max-w-3xl p-8">
        <Suspense fallback={<Skeleton className="h-[600px]" />}>
          <CreateForm />
        </Suspense>
      </Card>
    </>
  );
}

async function CreateForm() {
  await requireWorkspace("editor");
  const profile = await getProfile();
  return (
    <ShowForm
      action={createShow}
      mode="create"
      feedHost={FEED_HOST}
      initial={{ author: profile?.full_name ?? "", owner_email: profile?.email ?? "" }}
    />
  );
}
