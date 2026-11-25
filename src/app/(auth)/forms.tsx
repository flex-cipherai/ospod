"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { buttonClass, Field, Label, inputClass, Notice } from "@/components/ui";
import {
  requestPasswordReset,
  signIn,
  signInWithGoogle,
  signUp,
  updatePassword,
  type AuthState,
} from "./actions";

const initial: AuthState = {};

function PasswordField({
  id,
  label,
  error,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  error?: string;
  autoComplete: string;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required
          className={`${inputClass} pr-12 ${error ? "border-danger" : ""}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-1 my-1 inline-flex w-10 items-center justify-center rounded-lg text-muted hover:text-ink"
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
        >
          {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={pending} className={buttonClass({ size: "lg", full: true })}>
      {pending ? "One moment…" : children}
    </button>
  );
}

function GoogleButton({ next }: { next: string }) {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="next" value={next} />
      <button type="submit" className={buttonClass({ variant: "secondary", size: "lg", full: true })}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Continue with Google
      </button>
    </form>
  );
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-4 text-sm text-muted" role="separator">
      <span className="h-px flex-1 bg-line-strong" />
      or
      <span className="h-px flex-1 bg-line-strong" />
    </div>
  );
}

function CheckEmail({ email, children }: { email: string; children: React.ReactNode }) {
  return (
    <div role="status">
      <span className="mb-6 inline-flex size-14 items-center justify-center rounded-2xl bg-gold-soft text-gold-ink">
        <MailCheck size={28} aria-hidden="true" />
      </span>
      <h1 className="mb-3 text-[34px] leading-tight font-bold tracking-[-0.02em]">Check your email</h1>
      <p className="text-[17px] text-slate">
        We sent a link to <strong className="text-ink">{email}</strong>. {children}
      </p>
      <p className="mt-6 text-sm text-muted">
        Nothing there? Check your spam folder, or{" "}
        <Link href="/login" className="font-semibold text-ink underline underline-offset-2">
          go back to sign in
        </Link>
        .
      </p>
    </div>
  );
}

const linkErrors: Record<string, string> = {
  link: "That link has expired or was already used. Please try again.",
  google: "Google sign-in didn't work. Please try again or use your email.",
  config: "Ospod isn't connected to its database yet.",
};

export function LoginForm({ google }: { google: boolean }) {
  const params = useSearchParams();
  const next = params.get("next") ?? "/app";
  const linkError = linkErrors[params.get("error") ?? ""];
  const [state, action, pending] = useActionState(signIn, initial);

  return (
    <>
      <h1 className="mb-2 text-[34px] leading-tight font-bold tracking-[-0.02em]">Welcome back</h1>
      <p className="mb-8 text-[17px] text-slate">Sign in to your Ospod account.</p>

      {google && (
        <>
          <GoogleButton next={next} />
          <Divider />
        </>
      )}

      <form action={action} className="space-y-5" noValidate>
        {(state.error || linkError) && <Notice tone="error">{state.error ?? linkError}</Notice>}
        <input type="hidden" name="next" value={next} />
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          error={state.fieldErrors?.email}
        />
        <div>
          <PasswordField id="password" label="Password" autoComplete="current-password" error={state.fieldErrors?.password} />
          <Link href="/forgot-password" className="mt-2 inline-block text-sm font-semibold text-slate underline-offset-2 hover:underline">
            Forgot your password?
          </Link>
        </div>
        <SubmitButton pending={pending}>Sign in</SubmitButton>
      </form>

      <p className="mt-8 text-center text-[15px] text-slate">
        New to Ospod?{" "}
        <Link href="/signup" className="font-semibold text-ink underline underline-offset-2">
          Start your free trial
        </Link>
      </p>
    </>
  );
}

export function SignupForm({ google }: { google: boolean }) {
  const next = useSearchParams().get("next") ?? "/app";
  const [state, action, pending] = useActionState(signUp, initial);

  if (state.sentTo) {
    return <CheckEmail email={state.sentTo}>Click it to confirm your address and open your dashboard.</CheckEmail>;
  }

  return (
    <>
      <h1 className="mb-2 text-[34px] leading-tight font-bold tracking-[-0.02em]">Start your free trial</h1>
      <p className="mb-8 text-[17px] text-slate">14 days free. No card needed.</p>

      {google && (
        <>
          <GoogleButton next={next} />
          <Divider />
        </>
      )}

      <form action={action} className="space-y-5" noValidate>
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <input type="hidden" name="next" value={next} />
        <Field
          id="full_name"
          label="Your name"
          autoComplete="name"
          required
          defaultValue={state.values?.full_name}
          error={state.fieldErrors?.full_name}
        />
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          error={state.fieldErrors?.email}
        />
        <PasswordField
          id="password"
          label="Password"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={state.fieldErrors?.password}
        />
        <SubmitButton pending={pending}>Create account</SubmitButton>
        <p className="text-center text-sm text-muted">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-2">
            terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            privacy policy
          </Link>
          .
        </p>
      </form>

      <p className="mt-8 text-center text-[15px] text-slate">
        Already have an account?{" "}
        <Link href={next === "/app" ? "/login" : `/login?next=${encodeURIComponent(next)}`} className="font-semibold text-ink underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);

  if (state.sentTo) {
    return <CheckEmail email={state.sentTo}>If there's an Ospod account for that address, the link lets you choose a new password.</CheckEmail>;
  }

  return (
    <>
      <h1 className="mb-2 text-[34px] leading-tight font-bold tracking-[-0.02em]">Reset your password</h1>
      <p className="mb-8 text-[17px] text-slate">Enter your email and we'll send you a link to choose a new one.</p>
      <form action={action} className="space-y-5" noValidate>
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          error={state.fieldErrors?.email}
        />
        <SubmitButton pending={pending}>Send reset link</SubmitButton>
      </form>
      <p className="mt-8 text-center text-[15px] text-slate">
        <Link href="/login" className="font-semibold text-ink underline underline-offset-2">
          Back to sign in
        </Link>
      </p>
    </>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initial);
  return (
    <>
      <h1 className="mb-2 text-[34px] leading-tight font-bold tracking-[-0.02em]">Choose a new password</h1>
      <p className="mb-8 text-[17px] text-slate">You'll be signed in once it's saved.</p>
      <form action={action} className="space-y-5" noValidate>
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <PasswordField
          id="password"
          label="New password"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={state.fieldErrors?.password}
        />
        <PasswordField id="confirm" label="Type it again" autoComplete="new-password" error={state.fieldErrors?.confirm} />
        <SubmitButton pending={pending}>Save password</SubmitButton>
      </form>
    </>
  );
}
