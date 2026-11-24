"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import type { ReactNode } from "react";

export function NavLink({ href, exact = false, children }: { href: string; exact?: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors",
        active ? "bg-canvas font-semibold text-ink" : "text-slate hover:bg-canvas/70 hover:text-ink",
      )}
    >
      {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-full bg-gold" />}
      {children}
    </Link>
  );
}
