import { requestPasswordReset } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/auth/auth-form";
import type { Metadata } from "next";
export const metadata:Metadata={title:"Forgot Password",description:"Request a secure Squad Planner password reset link."};

export default function ForgotPasswordPage() {
  return <AuthForm mode="forgot" action={requestPasswordReset} />;
}
