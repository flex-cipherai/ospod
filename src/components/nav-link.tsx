"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { clsx } from "clsx";

type Props = { href: string; exact?: boolean; children: ReactNode };

function LinkBody({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
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

function ActiveAwareLink({ href, exact = false, children }: Props) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <LinkBody href={href} active={active}>
      {children}
    </LinkBody>
  );
}

/** Sidebar link that highlights itself on its own section. The highlight streams in on dynamic pages. */
export function NavLink(props: Props) {
  return (
    <Suspense
      fallback={
        <LinkBody href={props.href} active={false}>
          {props.children}
        </LinkBody>
      }
    >
      <ActiveAwareLink {...props} />
    </Suspense>
  );
}
