import Link from "next/link";
import { OspodLogo } from "@/components/logo";
import { buttonClass } from "@/components/ui";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-6 px-10 py-6">
        <OspodLogo />
        <nav aria-label="Main" className="flex items-center gap-2">
          <Link href="/#features" className={buttonClass({ variant: "ghost" })}>Features</Link>
          <Link href="/pricing" className={buttonClass({ variant: "ghost" })}>Pricing</Link>
          <Link href="/login" className={buttonClass({ variant: "ghost" })}>Sign in</Link>
          <Link href="/signup" className={buttonClass({ variant: "gold" })}>Start free trial</Link>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mx-auto mt-32 w-full max-w-[1200px] px-10">
        <div className="flex flex-wrap items-center justify-between gap-6 border-t-[1.5px] border-line-strong py-12 text-[15px] text-muted">
          <OspodLogo size={26} />
          <nav aria-label="Footer" className="flex flex-wrap gap-6">
            <Link href="/pricing" className="hover:text-ink">Pricing</Link>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
            <Link href="/login" className="hover:text-ink">Sign in</Link>
          </nav>
          <p>© Ospod</p>
        </div>
      </footer>
    </div>
  );
}
