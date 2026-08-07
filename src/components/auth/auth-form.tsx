"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { initialFormState, type FormState } from "@/types/forms";

type AuthAction = (state: FormState, formData: FormData) => Promise<FormState>;
type Mode = "login" | "signup" | "forgot" | "reset";

const content = {
  login: { title: "Welcome back", description: "Sign in to manage your cricket teams.", button: "Sign in", pending: "Signing in…" },
  signup: { title: "Create your account", description: "Start planning your tournament squad.", button: "Create account", pending: "Creating account…" },
  forgot: { title: "Reset your password", description: "We’ll email you a secure reset link.", button: "Send reset link", pending: "Sending link…" },
  reset: { title: "Choose a new password", description: "Use at least 8 characters for your new password.", button: "Update password", pending: "Updating password…" },
} satisfies Record<Mode, { title: string; description: string; button: string; pending: string }>;

export function AuthForm({ mode, action, callbackError = false }: { mode: Mode; action: AuthAction; callbackError?: boolean }) {
  const [state, formAction] = useActionState(action, initialFormState);
  const copy = content[mode];
  const showEmail = mode !== "reset";
  const showPassword = mode === "login" || mode === "signup" || mode === "reset";

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-bold text-pitch">Squad Planner</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">{copy.title}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">{copy.description}</p>

      <form action={formAction} className="mt-7 space-y-4">
        {mode === "signup" ? <Field label="Full name" name="fullName" autoComplete="name" required /> : null}
        {showEmail ? <Field label="Email address" name="email" type="email" autoComplete="email" required /> : null}
        {showPassword ? <Field label={mode === "login" ? "Password" : "New password"} name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "login" ? undefined : 8} required /> : null}
        {(mode === "signup" || mode === "reset") ? <Field label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /> : null}

        {callbackError ? <FormMessage state={{ status: "error", message: "That authentication link is invalid or has expired." }} /> : null}
        <FormMessage state={state} />
        <SubmitButton pendingLabel={copy.pending}>{copy.button}</SubmitButton>
      </form>

      <AuthLinks mode={mode} />
    </div>
  );
}

function Field({ label, name, type = "text", ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <input name={name} type={type} {...props} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-ink shadow-sm outline-none transition placeholder:text-slate-400 focus:border-pitch focus:ring-4 focus:ring-pitch/10" />
    </label>
  );
}

function AuthLinks({ mode }: { mode: Mode }) {
  if (mode === "login") return <div className="mt-5 flex items-center justify-between gap-4 text-sm"><Link className="font-medium text-slate-600 hover:text-pitch" href="/forgot-password">Forgot password?</Link><Link className="font-bold text-pitch hover:text-pitch-dark" href="/signup">Create account</Link></div>;
  if (mode === "signup") return <p className="mt-5 text-center text-sm text-slate-600">Already registered? <Link className="font-bold text-pitch" href="/login">Sign in</Link></p>;
  return <p className="mt-5 text-center text-sm"><Link className="font-bold text-pitch" href="/login">Back to sign in</Link></p>;
}
