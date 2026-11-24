import type { Metadata } from "next";
import { Suspense } from "react";
import { googleSignInEnabled } from "@/lib/env";
import { LoginForm } from "../forms";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm google={googleSignInEnabled} />
    </Suspense>
  );
}
