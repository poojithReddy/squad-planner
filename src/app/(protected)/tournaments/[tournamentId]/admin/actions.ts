"use server";

import { revalidatePath } from "next/cache";
import { applicationOrigin } from "@/lib/auth/origin";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTournamentAdmin } from "@/lib/tournament/admin-access";
import type { TeamRole } from "@/types/database";

const teamRoles=["captain","vice_captain","manager","member","viewer"] as const;
function field(data:FormData,key:string){return String(data.get(key)??"").trim()}
function number(data:FormData,key:string){return Number(field(data,key))}

export async function createManagedTeam(tournamentId:string,_state:{message:string;ok?:boolean},data:FormData){
  const{supabase}=await requireTournamentAdmin(tournamentId);const name=field(data,"name"),squadSize=number(data,"squadSize"),budget=number(data,"budget");
  if(!name)return{ok:false,message:"Team name is required."};
  if(!Number.isInteger(squadSize)||squadSize<=0)return{ok:false,message:"Squad size must be greater than 0."};
  if(!Number.isFinite(budget)||budget<0)return{ok:false,message:"Auction budget must be 0 or greater."};
  const{error}=await supabase.rpc("admin_create_tournament_team",{p_tournament_id:tournamentId,p_name:name,p_primary_colour:field(data,"primaryColour")||"#15803d",p_secondary_colour:field(data,"secondaryColour")||null,p_squad_size:squadSize,p_total_auction_budget:budget,p_manager_name:field(data,"managerName")||null});
  if(error)return{ok:false,message:"We couldn't create this tournament team."};
  revalidatePath(`/tournaments/${tournamentId}/admin`);return{ok:true,message:"Team created. Assign its Captain and Vice Captain when ready."};
}

export async function inviteOrAssignUser(tournamentId:string,_state:{message:string;ok?:boolean},data:FormData){
  const{supabase}=await requireTournamentAdmin(tournamentId);const teamId=field(data,"teamId"),email=field(data,"email").toLowerCase(),fullName=field(data,"fullName"),role=field(data,"role") as TeamRole,replace=data.get("replace")==="on";
  if(!teamId||!email.includes("@")||!teamRoles.includes(role as typeof teamRoles[number]))return{ok:false,message:"Enter a valid email, team and role."};
  const{data:result,error}=await supabase.rpc("admin_invite_team_user",{p_tournament_id:tournamentId,p_team_id:teamId,p_email:email,p_full_name:fullName,p_role:role as Exclude<TeamRole,"owner">,p_replace:replace});
  if(error){if(error.message.includes("REPLACE_REQUIRED"))return{ok:false,message:"This leadership role is already assigned. Select Replace and submit again."};return{ok:false,message:"We couldn't assign this user."}}
  const status=result&&typeof result==="object"&&!Array.isArray(result)?String(result.status??""):"";
  if(status==="invited"){
    const admin=createAdminClient();
    if(!admin)return{ok:true,message:"Invitation recorded. Configure SUPABASE_SERVICE_ROLE_KEY on the server to send the Supabase invitation email; the membership will still activate if this email signs up."};
    const{error:inviteError}=await admin.auth.admin.inviteUserByEmail(email,{data:{full_name:fullName},redirectTo:`${applicationOrigin()}/auth/callback?next=/dashboard`});
    if(inviteError)return{ok:true,message:"Invitation access was recorded, but the email could not be sent. Check Supabase SMTP and service-role configuration."};
  }
  revalidatePath(`/tournaments/${tournamentId}/admin`);revalidatePath(`/tournaments/${tournamentId}/admin/users`);
  return{ok:true,message:status==="assigned"?"Existing user assigned successfully.":"Invitation email sent. Access activates when the user accepts it."};
}

export async function removeTeamAccess(tournamentId:string,teamId:string,userId:string){
  const{supabase}=await requireTournamentAdmin(tournamentId);const{error}=await supabase.rpc("admin_remove_team_access",{p_tournament_id:tournamentId,p_team_id:teamId,p_user_id:userId});
  if(error)return{ok:false,message:"We couldn't remove this team access."};revalidatePath(`/tournaments/${tournamentId}/admin`);revalidatePath(`/tournaments/${tournamentId}/admin/users`);return{ok:true,message:"Team access removed."};
}

export async function updateTournamentSettings(tournamentId:string,_state:{message:string;ok?:boolean},data:FormData){
  const{supabase}=await requireTournamentAdmin(tournamentId);const name=field(data,"name"),start=field(data,"startDate"),end=field(data,"endDate")||null;
  if(!name||!start)return{ok:false,message:"Tournament name and start date are required."};if(end&&end<start)return{ok:false,message:"End date cannot be before start date."};
  const{error}=await supabase.from("tournaments").update({name,start_date:start,end_date:end,location:field(data,"location")||null,notes:field(data,"notes")||null}).eq("id",tournamentId);
  if(error)return{ok:false,message:"We couldn't update tournament settings."};revalidatePath(`/tournaments/${tournamentId}/admin`);return{ok:true,message:"Tournament settings updated."};
}

export async function updateManagedTeam(tournamentId:string,teamId:string,_state:{message:string;ok?:boolean},data:FormData){
  const{supabase}=await requireTournamentAdmin(tournamentId);const name=field(data,"name"),squadSize=number(data,"squadSize"),budget=number(data,"budget");
  if(!name||!Number.isInteger(squadSize)||squadSize<=0||!Number.isFinite(budget)||budget<0)return{ok:false,message:"Check the team name, squad size and auction budget."};
  const{error}=await supabase.from("teams").update({name,primary_colour:field(data,"primaryColour")||null,secondary_colour:field(data,"secondaryColour")||null,squad_size:squadSize,total_auction_budget:budget,manager_name:field(data,"managerName")||null}).eq("id",teamId).eq("tournament_id",tournamentId);
  if(error)return{ok:false,message:"We couldn't update this team."};revalidatePath(`/tournaments/${tournamentId}/admin`);revalidatePath(`/tournaments/${tournamentId}/admin/teams/${teamId}`);return{ok:true,message:"Team setup updated."};
}
