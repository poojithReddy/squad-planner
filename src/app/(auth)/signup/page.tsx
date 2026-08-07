import { signUp } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/auth/auth-form";
import type { Metadata } from "next";
export const metadata:Metadata={title:"Sign Up",description:"Create your Squad Planner account."};

export default function SignupPage() {
  return <AuthForm mode="signup" action={signUp} />;
}
