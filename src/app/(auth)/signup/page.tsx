import type { Metadata } from "next";
import { googleSignInEnabled } from "@/lib/env";
import { SignupForm } from "../forms";

export const metadata: Metadata = { title: "Start your free trial" };

export default function SignupPage() {
  return <SignupForm google={googleSignInEnabled} />;
}
