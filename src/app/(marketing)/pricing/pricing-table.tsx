"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { clsx } from "clsx";
import { buttonClass } from "@/components/ui";
import { PLANS, YEARLY_DISCOUNT, yearlyMonthlyPrice } from "@/lib/plans";

export function PricingTable({ contactEmail }: { contactEmail: string }) {
  const [yearly, setYearly] = useState(false);

  return (
    <>
      <div className="mb-12 flex justify-center">
        <div role="group" aria-label="Billing period" className="inline-flex rounded-full border border-line bg-white p-1">
          {[
            { value: false, label: "Monthly" },
            { value: true, label: `Yearly · save ${Math.round(YEARLY_DISCOUNT * 100)}%` },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              aria-pressed={yearly === opt.value}
              onClick={() => setYearly(opt.value)}
              className={clsx(
                "min-h-11 rounded-full px-5 text-[15px] font-semibold transition-colors",
                yearly === opt.value ? "bg-ink text-white" : "text-slate hover:text-ink",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {PLANS.map((plan) => {
          const price = plan.monthly === null ? null : yearly ? yearlyMonthlyPrice(plan.monthly) : plan.monthly;
          return (
            <article
              key={plan.id}
              className={clsx(
                "relative flex flex-col rounded-[20px] border p-6",
                plan.highlight ? "on-dark border-ink bg-ink text-white" : "border-line bg-white",
              )}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-gold px-3 py-1 text-xs font-bold text-ink">Most popular</span>
              )}
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <p className={clsx("mt-1 min-h-[3em] text-[15px]", plan.highlight ? "text-mist" : "text-slate")}>{plan.tagline}</p>
              <p className="mt-5 mb-1">
                {price === null ? (
                  <span className="text-[40px] leading-none font-bold tracking-[-0.03em]">Custom</span>
                ) : (
                  <>
                    <span className="text-[40px] leading-none font-bold tracking-[-0.03em] tabular-nums">${price}</span>
                    <span className={plan.highlight ? "text-mist" : "text-muted"}> /month</span>
                  </>
                )}
              </p>
              <p className={clsx("mb-6 min-h-5 text-sm", plan.highlight ? "text-mist" : "text-muted")}>
                {price !== null && yearly ? `$${(price * 12).toLocaleString("en-US")} billed yearly` : price !== null ? "Billed monthly" : "Talk to us"}
              </p>
              <Link
                href={plan.monthly === null ? `mailto:${contactEmail}?subject=Ospod%20Network%20plan` : `/signup?plan=${plan.id}`}
                className={buttonClass({ variant: plan.highlight ? "gold" : "primary", full: true })}
              >
                {plan.monthly === null ? "Contact us" : "Start free trial"}
              </Link>
              <ul className="mt-6 space-y-3 text-[15px]">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check size={18} className={clsx("mt-0.5 shrink-0", plan.highlight ? "text-gold" : "text-success")} aria-hidden="true" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </>
  );
}
