import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Badge, Card, Notice, Skeleton, buttonClass, inputClass } from "@/components/ui";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { planById, formatNumber } from "@/lib/plans";

export const metadata: Metadata = { title: "Users" };

const PAGE_SIZE = 50;

type Row = {
  id: string;
  email: string;
  full_name: string | null;
  platform_role: "user" | "super_admin";
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
  workspace_name: string | null;
  plan: string | null;
  plan_status: "trialing" | "active" | "past_due" | "canceled" | null;
  total_count: number;
};

const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Never";

const statusTone = { trialing: "gold", active: "success", past_due: "danger", canceled: "neutral" } as const;
const statusLabel = { trialing: "Trial", active: "Active", past_due: "Payment due", canceled: "Cancelled" } as const;

export default function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  return (
    <>
      <PageHeader title="Users" description="Everyone with an Ospod account." />
      <Suspense fallback={<Skeleton className="h-[480px] rounded-[20px]" />}>
        <UsersTable searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function UsersTable({ searchParams }: { searchParams: PageProps<"/admin/users">["searchParams"] }) {
  await requireSuperAdmin();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const page = Math.max(0, Number.parseInt(typeof params.page === "string" ? params.page : "0", 10) || 0);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_users", { search: q || null, page_size: PAGE_SIZE, page });
  if (error) return <Notice tone="error">We couldn't load users. {error.message}</Notice>;

  const rows = (data ?? []) as Row[];
  const total = rows[0]?.total_count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => `/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <Card className="overflow-hidden">
      <form className="flex flex-wrap items-center gap-3 border-b border-line p-5" role="search">
        <div className="relative min-w-[260px] flex-1">
          <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <label htmlFor="q" className="sr-only">Search by name or email</label>
          <input id="q" name="q" defaultValue={q} placeholder="Search by name or email" className={`${inputClass} pl-11`} />
        </div>
        <button type="submit" className={buttonClass()}>Search</button>
        {q && <Link href="/admin/users" className={buttonClass({ variant: "ghost" })}>Clear</Link>}
        <p className="ml-auto text-sm text-muted">{formatNumber(total)} {total === 1 ? "user" : "users"}</p>
      </form>

      {rows.length === 0 ? (
        <p className="px-8 py-16 text-center text-slate">{q ? `No one matches "${q}".` : "No users yet."}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[15px]">
            <thead className="border-b border-line bg-canvas/60 text-sm text-muted">
              <tr>
                <th scope="col" className="px-6 py-3 font-semibold">Person</th>
                <th scope="col" className="px-4 py-3 font-semibold">Workspace</th>
                <th scope="col" className="px-4 py-3 font-semibold">Plan</th>
                <th scope="col" className="px-4 py-3 font-semibold">Joined</th>
                <th scope="col" className="px-6 py-3 font-semibold">Last sign-in</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-6 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{r.full_name || "—"}</span>
                      {r.platform_role === "super_admin" && <Badge tone="ink">Super admin</Badge>}
                      {!r.email_confirmed && <Badge>Email not confirmed</Badge>}
                    </div>
                    <span className="text-sm text-muted">{r.email}</span>
                  </td>
                  <td className="px-4 py-3.5 text-slate">{r.workspace_name ?? "—"}</td>
                  <td className="px-4 py-3.5">
                    {r.plan && r.plan_status ? (
                      <div className="flex items-center gap-2">
                        <span>{planById(r.plan)?.name}</span>
                        <Badge tone={statusTone[r.plan_status]}>{statusLabel[r.plan_status]}</Badge>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-slate">{date(r.created_at)}</td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-slate">{date(r.last_sign_in_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between border-t border-line px-6 py-4 text-sm">
          {page > 0 ? <Link href={href(page - 1)} className={buttonClass({ variant: "secondary", size: "sm" })}>Previous</Link> : <span />}
          <span className="text-muted">Page {page + 1} of {pages}</span>
          {page + 1 < pages ? <Link href={href(page + 1)} className={buttonClass({ variant: "secondary", size: "sm" })}>Next</Link> : <span />}
        </nav>
      )}
    </Card>
  );
}
