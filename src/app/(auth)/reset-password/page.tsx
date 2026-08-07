import { resetPassword } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/auth/auth-form";

export default function ResetPasswordPage() {
  return <AuthForm mode="reset" action={resetPassword} />;
}
