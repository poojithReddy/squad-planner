import { signUp } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/auth/auth-form";

export default function SignupPage() {
  return <AuthForm mode="signup" action={signUp} />;
}
