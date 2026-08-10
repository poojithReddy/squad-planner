"use server";

import { revalidatePath } from "next/cache";
import { applicationOrigin } from "@/lib/auth/origin";
import { requireSuperAdmin } from "@/lib/platform/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TournamentLifecycle,TournamentRole } from "@/types/database";

type State={message:string;ok?:boolean};
const statuses=["draft","setup","active","completed","archived"] as const;
const roles=["tournament_admin","tournament_viewer"] as const;
const field=(data:FormData,key:string)=>String(data.get(key)??"").trim();

export async function createTournament(_state:State,data:FormData):Promise<State>{
  const{supabase}=await requireSuperAdmin();const name=field(data,"name"),start=field(data,"startDate"),end=field(data,"endDate")||null,status=field(data,"status") as TournamentLifecycle;
  if(!name||!start)return{message:"Tournament name and start date are required."};
  if(end&&end<start)return{message:"End date cannot be before start date."};
  if(!statuses.includes(status))return{message:"Choose a valid tournament status."};
  const{error}=await supabase.rpc("super_admin_create_tournament",{p_name:name,p_start_date:start,p_end_date:end,p_location:field(data,"location")||null,p_notes:field(data,"notes")||null,p_status:status});
  if(error)return{message:"We couldn't create the tournament. Confirm Migration 010 is applied."};
  revalidatePath("/admin");revalidatePath("/admin/tournaments");return{ok:true,message:"Tournament created successfully."};
}

export async function updateTournament(tournamentId:string,_state:State,data:FormData):Promise<State>{
  const{supabase}=await requireSuperAdmin();const name=field(data,"name"),start=field(data,"startDate"),end=field(data,"endDate")||null,status=field(data,"status") as TournamentLifecycle;
  if(!name||!start||!statuses.includes(status)||Boolean(end&&end<start))return{message:"Check the tournament name, dates and status."};
  const{error}=await supabase.rpc("super_admin_update_tournament",{p_tournament_id:tournamentId,p_name:name,p_start_date:start,p_end_date:end,p_location:field(data,"location")||null,p_notes:field(data,"notes")||null,p_status:status});
  if(error)return{message:"We couldn't update this tournament."};revalidatePath("/admin");revalidatePath(`/admin/tournaments/${tournamentId}`);return{ok:true,message:"Tournament updated."};
}

export async function inviteTournamentUser(tournamentId:string,_state:State,data:FormData):Promise<State>{
  const{supabase}=await requireSuperAdmin();const email=field(data,"email").toLowerCase(),fullName=field(data,"fullName"),role=field(data,"role") as TournamentRole;
  if(!email.includes("@")||!roles.includes(role))return{message:"Enter a valid email and role."};
  const{data:result,error}=await supabase.rpc("super_admin_invite_tournament_user",{p_tournament_id:tournamentId,p_email:email,p_full_name:fullName,p_role:role});
  if(error)return{message:"We couldn't assign this tournament access."};
  const status=result&&typeof result==="object"&&!Array.isArray(result)?String(result.status??""):"";
  if(status==="invited"){
    const admin=createAdminClient();
    if(!admin)return{ok:true,message:"Invitation recorded. Add SUPABASE_SERVICE_ROLE_KEY on the server to send the email."};
    const{error:inviteError}=await admin.auth.admin.inviteUserByEmail(email,{data:{full_name:fullName},redirectTo:`${applicationOrigin()}/auth/callback?next=/dashboard`});
    if(inviteError)return{ok:true,message:"Access was recorded, but the email could not be sent. Check SMTP and server credentials."};
  }
  revalidatePath("/admin/users");revalidatePath(`/admin/tournaments/${tournamentId}`);return{ok:true,message:status==="assigned"?"Existing user assigned.":"Invitation sent."};
}

export async function removeTournamentAccess(tournamentId:string,userId:string){
  const{supabase}=await requireSuperAdmin();const{error}=await supabase.rpc("super_admin_remove_tournament_access",{p_tournament_id:tournamentId,p_user_id:userId});
  if(error)return{ok:false,message:"We couldn't remove this access."};revalidatePath("/admin/users");revalidatePath(`/admin/tournaments/${tournamentId}`);return{ok:true,message:"Tournament access removed."};
}
