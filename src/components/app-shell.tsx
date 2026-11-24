import { Suspense, type ReactNode } from "react";
import { BarChart3, Home, Mic2, Scissors, Send, Settings, ShieldCheck, Users, Building2, LayoutDashboard, ArrowLeft } from "lucide-react";
import { OspodLogo } from "@/components/logo";
import { Skeleton } from "@/components/ui";
import { getProfile, getWorkspace, firstName } from "@/lib/auth";
import { NavLink } from "@/components/nav-link";

type NavItem = { href: string; label: string; icon: ReactNode; soon?: string };

const appNav: NavItem[] = [
  { href: "/app", label: "Home", icon: <Home size={18} /> },
  { href: "/app/shows", label: "Shows", icon: <Mic2 size={18} />, soon: "Soon" },
  { href: "/app/publish", label: "Publish", icon: <Send size={18} />, soon: "Soon" },
  { href: "/app/clips", label: "Clips", icon: <Scissors size={18} />, soon: "Soon" },
  { href: "/app/analytics", label: "Analytics", icon: <BarChart3 size={18} />, soon: "Soon" },
];

const adminNav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: <LayoutDashboard size={18} /> },
  { href: "/admin/users", label: "Users", icon: <Users size={18} /> },
  { href: "/admin/workspaces", label: "Workspaces", icon: <Building2 size={18} /> },
];

function NavList({ items }: { items: NavItem[] }) {
  return (
    <ul className="space-y-1">
      {items.map((item) =>
        item.soon ? (
          <li key={item.href}>
            <span
              className="flex min-h-11 cursor-default items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-subtle"
              aria-disabled="true"
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
              <span className="ml-auto rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold text-muted">{item.soon}</span>
            </span>
          </li>
        ) : (
          <li key={item.href}>
            <NavLink href={item.href} exact={item.href === "/app" || item.href === "/admin"}>
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          </li>
        ),
      )}
    </ul>
  );
}

async function AccountBlock({ area }: { area: "app" | "admin" }) {
  const [profile, workspace] = await Promise.all([getProfile(), getWorkspace()]);
  if (!profile) return null;
  const isAdmin = profile.platform_role === "super_admin";
  const initial = firstName(profile).charAt(0).toUpperCase();

  return (
    <div className="space-y-1">
      {area === "app" && (
        <NavLink href="/app/settings">
          <Settings size={18} aria-hidden="true" />
          Settings
        </NavLink>
      )}
      {area === "app" && isAdmin && (
        <NavLink href="/admin">
          <ShieldCheck size={18} aria-hidden="true" />
          Super admin
        </NavLink>
      )}
      {area === "admin" && (
        <NavLink href="/app">
          <ArrowLeft size={18} aria-hidden="true" />
          Back to my dashboard
        </NavLink>
      )}
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-line p-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-gold font-bold text-ink" aria-hidden="true">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{profile.full_name || firstName(profile)}</p>
          <p className="truncate text-xs text-muted">{area === "admin" ? "Super admin" : workspace?.name}</p>
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" className="rounded-lg px-2 py-1 text-xs font-semibold text-slate hover:bg-canvas hover:text-ink">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

export function AppShell({ area, children }: { area: "app" | "admin"; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 flex h-dvh w-[264px] shrink-0 flex-col border-r border-line bg-white px-4 py-6">
        <div className="mb-8 flex items-center gap-2 px-2">
          <OspodLogo href={area === "admin" ? "/admin" : "/app"} size={28} />
          {area === "admin" && (
            <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-gold">Admin</span>
          )}
        </div>
        <nav aria-label={area === "admin" ? "Admin" : "Main"} className="flex-1">
          <NavList items={area === "admin" ? adminNav : appNav} />
        </nav>
        <Suspense fallback={<Skeleton className="h-16" />}>
          <AccountBlock area={area} />
        </Suspense>
      </aside>
      <main id="main" className="min-w-0 flex-1 px-10 py-10">
        <div className="mx-auto max-w-[1120px]">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[34px] leading-tight font-bold tracking-[-0.025em]">{title}</h1>
        {description && <p className="mt-1.5 text-[17px] text-slate">{description}</p>}
      </div>
      {actions}
    </header>
  );
}
