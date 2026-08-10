"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { applicationOrigin } from "@/lib/auth/origin";
import { requireTeamAccess } from "@/lib/planning/access";
import { createClient } from "@/lib/supabase/server";

export async function createAvailabilityLink(teamId:string,tournamentId:string,expiresAt:string|null){const{user}=await requireTeamAccess(teamId,true);const s=await createClient();const token=randomBytes(32).toString("base64url"),tokenHash=createHash("sha256").update(token).digest("hex");await s.from("tournament_availability_links").update({is_active:false}).eq("team_id",teamId).eq("tournament_id",tournamentId).eq("is_active",true);const{error}=await s.from("tournament_availability_links").insert({team_id:teamId,tournament_id:tournamentId,token_hash:tokenHash,created_by:user.id,expires_at:expiresAt||null});if(error)return{ok:false,message:"We couldn't create the availability link."};revalidatePath(`/teams/${teamId}/tournament/availability`);return{ok:true,url:`${applicationOrigin()}/availability/${token}`}}
export async function disableAvailabilityLink(teamId:string,tournamentId:string){await requireTeamAccess(teamId,true);const s=await createClient();const{error}=await s.from("tournament_availability_links").update({is_active:false}).eq("team_id",teamId).eq("tournament_id",tournamentId).eq("is_active",true);revalidatePath(`/teams/${teamId}/tournament/availability`);return{ok:!error,message:error?"We couldn't disable the link.":"Availability link disabled."}}
