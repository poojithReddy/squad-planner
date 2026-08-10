import "server-only";

import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function requireTournamentAdmin(tournamentId:string){
  const user=await requireUser();
  const supabase=await createClient();
  const[{data},{data:platformRole}]=await Promise.all([supabase.from("tournament_members").select("role").eq("tournament_id",tournamentId).eq("user_id",user.id).maybeSingle(),supabase.from("platform_roles").select("role").eq("user_id",user.id).eq("role","super_admin").maybeSingle()]);
  if(data?.role!=="tournament_admin"&&platformRole?.role!=="super_admin")notFound();
  return{user,supabase};
}

export async function getTournamentAdminMemberships(){
  const user=await requireUser();
  const supabase=await createClient();
  const{data}=await supabase.from("tournament_members").select("tournament_id,role").eq("user_id",user.id).eq("role","tournament_admin");
  return data??[];
}
