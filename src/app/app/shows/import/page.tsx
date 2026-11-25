import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { ImportWizard } from "./import-wizard";

export const metadata: Metadata = { title: "Import your show" };

export default function ImportShowPage() {
  return (
    <>
      <Link href="/app/shows/new" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" /> Add a show
      </Link>
      <PageHeader
        title="Import your show"
        description="We copy your episodes and details into Ospod. Your current host keeps working, and your listeners won't notice a thing."
      />
      <ImportWizard />
    </>
  );
}
