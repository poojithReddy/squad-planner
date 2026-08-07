import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata:Metadata={robots:{index:false,follow:false}};

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const displayName = profile?.full_name || String(user.claims.email ?? "Signed in user");
  return <DashboardShell displayName={displayName}>{children}</DashboardShell>;
}
