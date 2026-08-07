import { resetPassword } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/auth/auth-form";
import type { Metadata } from "next";
export const metadata:Metadata={title:"Reset Password",description:"Choose a new password for Squad Planner."};

export default function ResetPasswordPage() {
  return <AuthForm mode="reset" action={resetPassword} />;
}
