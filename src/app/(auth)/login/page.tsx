import { AuthForm } from "@/components/auth/auth-form";
import { signIn } from "@/app/(auth)/actions";
import type { Metadata } from "next";
export const metadata:Metadata={title:"Login",description:"Sign in to your Squad Planner account."};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <AuthForm mode="login" action={signIn} callbackError={params.error === "auth-callback"} />;
}
