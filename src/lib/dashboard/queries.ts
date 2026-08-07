import "server-only";

import { calculateTeamDashboard } from "@/lib/dashboard/calculations";
import { createClient } from "@/lib/supabase/server";
import { getAuthorisedTeam } from "@/lib/teams/queries";

export async function getTeamDashboardData(teamId:string){
  const supabase=await createClient();
  const today=new Date().toISOString().slice(0,10);
  const [teamResult,players,matches,matchPlayers,duties,assignments,tournament]=await Promise.all([
    getAuthorisedTeam(teamId),
    supabase.from("players").select("*").eq("team_id",teamId),
    supabase.from("matches").select("*").eq("team_id",teamId).order("match_date").order("match_time"),
    supabase.from("match_players").select("*").eq("team_id",teamId),
    supabase.from("volunteer_duties").select("*").eq("team_id",teamId).order("duty_date"),
    supabase.from("volunteer_duty_assignments").select("*").eq("team_id",teamId),
    supabase.from("tournaments").select("id,name,start_date,end_date,is_active").eq("team_id",teamId).eq("is_active",true).maybeSingle(),
  ]);
  if(!teamResult)return null;
  const queryErrors=[players.error,matches.error,matchPlayers.error,duties.error,assignments.error,tournament.error].filter(Boolean);
  if(queryErrors.length)throw new Error("We couldn't load the team dashboard. Please try again.");
  return {team:teamResult,tournament:tournament.data,metrics:calculateTeamDashboard(teamResult,players.data??[],matches.data??[],matchPlayers.data??[],duties.data??[],assignments.data??[],today)};
}
