import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · Ospod" }, robots: { index: false } };

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return <AppShell area="app">{children}</AppShell>;
}
