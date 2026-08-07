"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/types/forms";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function authError(message: string) {
  if (message.toLowerCase().includes("invalid login")) return "Email or password is incorrect.";
  if (message.toLowerCase().includes("already registered")) return "An account already exists for this email.";
  if (message.toLowerCase().includes("rate limit")) return "Too many attempts. Please wait and try again.";
  return message;
}

async function appOrigin() {
  const requestHeaders = await headers();
  return requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function signIn(_state: FormState, formData: FormData): Promise<FormState> {
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  if (!email || !password) return { status: "error", message: "Enter your email and password.", fields: { email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { status: "error", message: authError(error.message), fields: { email } };

  redirect("/dashboard");
}

export async function signUp(_state: FormState, formData: FormData): Promise<FormState> {
  const fullName = value(formData, "fullName");
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  const confirmPassword = value(formData, "confirmPassword");
  const fields = { fullName, email };

  if (!fullName || !email) return { status: "error", message: "Full name and email are required.", fields };
  if (password.length < 8) return { status: "error", message: "Password must be at least 8 characters.", fields };
  if (password !== confirmPassword) return { status: "error", message: "Passwords do not match.", fields };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${await appOrigin()}/auth/callback?next=/dashboard`,
    },
  });
  if (error) return { status: "error", message: authError(error.message), fields };
  if (data.session) redirect("/dashboard");

  return { status: "success", message: "Check your email to confirm your account, then sign in." };
}

export async function requestPasswordReset(_state: FormState, formData: FormData): Promise<FormState> {
  const email = value(formData, "email").toLowerCase();
  if (!email) return { status: "error", message: "Enter your email address." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await appOrigin()}/auth/callback?next=/reset-password`,
  });
  if (error) return { status: "error", message: authError(error.message), fields: { email } };

  return { status: "success", message: "If an account exists, a password reset link has been sent." };
}

export async function resetPassword(_state: FormState, formData: FormData): Promise<FormState> {
  const password = value(formData, "password");
  const confirmPassword = value(formData, "confirmPassword");
  if (password.length < 8) return { status: "error", message: "Password must be at least 8 characters." };
  if (password !== confirmPassword) return { status: "error", message: "Passwords do not match." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return { status: "error", message: "Your reset link has expired. Request a new one." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { status: "error", message: authError(error.message) };
  redirect("/dashboard?message=password-updated");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
