import type { Metadata } from "next";
import { TRIAL_DAYS } from "@/lib/plans";
import { contactEmail } from "@/lib/env";
import { PricingTable } from "./pricing-table";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple plans for audio and video podcasters. Every plan includes one-click publishing, AI and analytics.",
};

export default function PricingPage() {
  return (
    <section className="mx-auto max-w-[1360px] px-10 pt-12">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h1 className="mb-5 text-[clamp(44px,5.6vw,68px)] leading-[1] font-bold tracking-[-0.035em]">Plans that grow with your show</h1>
        <p className="text-[19px] text-slate">
          Every plan includes one-click publishing, AI tools, analytics and unlimited team members. Try any plan free for{" "}
          {TRIAL_DAYS} days. Pay by card or M-Pesa.
        </p>
      </div>
      <PricingTable contactEmail={contactEmail} />
      <p className="mt-10 text-center text-[15px] text-muted">
        Prices in US dollars. Download limits count combined downloads and streams per month across all your shows.
      </p>
    </section>
  );
}
