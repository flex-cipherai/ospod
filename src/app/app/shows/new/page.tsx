import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { AddShowChoices } from "../add-show-choices";

export const metadata: Metadata = { title: "Add a show" };

export default function NewShowPage() {
  return (
    <>
      <Link href="/app/shows" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" /> Shows
      </Link>
      <PageHeader title="Add a show" description="Bring in a podcast you already have, or start a new one." />
      <AddShowChoices />
    </>
  );
}
