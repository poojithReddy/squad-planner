import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { getPermissionMap } from "@/lib/permissions/server";

export const metadata:Metadata={robots:{index:false,follow:false}};

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: profile },{data:memberships},{data:adminMemberships},{data:platformRole}] = await Promise.all([supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),supabase.from("team_members").select("team_id").eq("user_id",user.id),supabase.from("tournament_members").select("tournament_id").eq("user_id",user.id).eq("role","tournament_admin"),supabase.from("platform_roles").select("role").eq("user_id",user.id).eq("role","super_admin").maybeSingle()]);
  const teamIds=(memberships??[]).map(item=>item.team_id);
  const{data:teams}=teamIds.length?await supabase.from("teams").select("id,name").in("id",teamIds).order("name"):{data:[]};
  const permissionEntries=await Promise.all((teams??[]).map(async team=>[team.id,await getPermissionMap("team",team.id)] as const));
  const permissionsByTeam=Object.fromEntries(permissionEntries);
  const tournamentIds=(adminMemberships??[]).map(item=>item.tournament_id);
  const{data:tournaments}=tournamentIds.length?await supabase.from("tournaments").select("id,name").in("id",tournamentIds).order("name"):{data:[]};
  const displayName = profile?.full_name || String(user.claims.email ?? "Signed in user");
  return <DashboardShell displayName={displayName} teams={teams??[]} adminTournaments={tournaments??[]} permissionsByTeam={permissionsByTeam} isSuperAdmin={platformRole?.role==="super_admin"}>{children}</DashboardShell>;
}
